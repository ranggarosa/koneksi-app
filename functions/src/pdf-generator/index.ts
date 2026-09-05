import * as logger from 'firebase-functions/logger'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { getGoogleWorkspaceClients } from '../google-client'

export interface GeneratePdfOptions {
  letterId: string
  googleDocTemplateId: string
  contentData: Record<string, unknown>
  letterNumber: string
  drafterName?: string
  approverName?: string
  approverSignatureUrl?: string
  createdAt?: string
}

/**
 * Formats a Date or ISO string into standard Indonesian date format (e.g. 5 September 2026).
 */
export function formatIndonesianDate(isoOrDate?: string | Date): string {
  const date = isoOrDate ? new Date(isoOrDate) : new Date()
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(isNaN(date.getTime()) ? new Date() : date)
}

/**
 * Finds character offset of a text pattern in a Google Docs document structure.
 */
function findPlaceholderOffset(document: any, placeholder: string): { startIndex: number; endIndex: number } | null {
  const content = document?.body?.content
  if (!Array.isArray(content)) return null

  for (const element of content) {
    if (element.paragraph?.elements) {
      for (const pElem of element.paragraph.elements) {
        const text = pElem.textRun?.content
        if (text && text.includes(placeholder)) {
          const indexWithinRun = text.indexOf(placeholder)
          const startIndex = (pElem.startIndex || 0) + indexWithinRun
          const endIndex = startIndex + placeholder.length
          return { startIndex, endIndex }
        }
      }
    }
  }
  return null
}

/**
 * Core engine for server-side PDF generation:
 * 1. Duplicates Google Doc master template (Drive API)
 * 2. Injects variables via string replacement & embeds E-Signature (Docs API)
 * 3. Exports rendered document to PDF & uploads to Firebase Storage (Drive API & Admin Storage)
 * 4. Cleans up temporary Google Doc and updates Firestore letter status
 */
export async function generatePdfFromGoogleDoc(options: GeneratePdfOptions): Promise<string> {
  const {
    letterId,
    googleDocTemplateId,
    contentData,
    letterNumber,
    drafterName = 'Drafter',
    approverName = 'Pejabat Berwenang',
    approverSignatureUrl,
    createdAt,
  } = options

  const db = getFirestore()
  let temporaryDocId: string | null = null
  let isCleanedUp = false

  logger.info(`Starting Server-Side PDF Generation for Letter ID: ${letterId}`, {
    letterNumber,
    googleDocTemplateId,
    hasSignature: Boolean(approverSignatureUrl),
  })

  try {
    const clients = getGoogleWorkspaceClients()

    // -------------------------------------------------------------
    // SIMULATION / MOCK MODE (For offline test suites & local demo)
    // -------------------------------------------------------------
    if (clients.isMockMode) {
      logger.info(`[MOCK MODE] Simulating Google Workspace PDF generation for ${letterId}`)
      const destination = `final_letters/${letterId}.pdf`
      const bucketName = process.env.VITE_FIREBASE_STORAGE_BUCKET || 'koneksi-app-dev.appspot.com'
      const mockPdfUrl = `https://storage.googleapis.com/${bucketName}/${destination}`

      // Attempt to save mock PDF buffer to Storage if bucket exists
      try {
        const bucket = getStorage().bucket(process.env.VITE_FIREBASE_STORAGE_BUCKET || undefined)
        const file = bucket.file(destination)
        const mockPdfContent = Buffer.from(
          `%PDF-1.4\n% Mock PDF for Letter ${letterNumber} (ID: ${letterId})\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000115 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n215\n%%EOF`
        )
        await file.save(mockPdfContent, {
          contentType: 'application/pdf',
          metadata: { metadata: { letterId, letterNumber } },
        })
      } catch (storageErr) {
        logger.warn('Mock Storage save skipped or failed, using standard mock URL', storageErr)
      }

      await db.collection('letters').doc(letterId).update({
        status: 'Approved',
        finalPdfUrl: mockPdfUrl,
        pdfError: null,
        updatedAt: new Date().toISOString(),
      })

      return mockPdfUrl
    }

    const { drive, docs } = clients

    // -------------------------------------------------------------
    // LANGKAH 1: Menyalin Master Template (Google Drive API)
    // -------------------------------------------------------------
    const sanitizedNumber = letterNumber.replace(/[\/\\]/g, '_')
    const copyResponse = await drive.files.copy({
      fileId: googleDocTemplateId,
      requestBody: {
        name: `Letter_${sanitizedNumber}_${letterId}`,
      },
      fields: 'id, name',
    })

    temporaryDocId = copyResponse.data.id || null
    if (!temporaryDocId) {
      throw new Error(`Gagal menyalin master template Google Doc (${googleDocTemplateId})`)
    }

    logger.info(`Temporary Google Doc created: ${temporaryDocId}`)

    // -------------------------------------------------------------
    // LANGKAH 2: Mail Merge & Injeksi Tanda Tangan (Google Docs API)
    // -------------------------------------------------------------
    // 2a. Siapkan daftar penggantian string (replaceAllText)
    const requests: any[] = []

    // Ganti nomor surat
    requests.push({
      replaceAllText: {
        containsText: { text: '{{NOMOR_SURAT}}', matchCase: false },
        replaceText: letterNumber,
      },
    })
    requests.push({
      replaceAllText: {
        containsText: { text: '{{LETTER_NUMBER}}', matchCase: false },
        replaceText: letterNumber,
      },
    })

    // Ganti tanggal & metadata
    const indonesianDate = formatIndonesianDate(createdAt)
    requests.push({
      replaceAllText: {
        containsText: { text: '{{TANGGAL_SURAT}}', matchCase: false },
        replaceText: indonesianDate,
      },
    })
    requests.push({
      replaceAllText: {
        containsText: { text: '{{TANGGAL}}', matchCase: false },
        replaceText: indonesianDate,
      },
    })
    requests.push({
      replaceAllText: {
        containsText: { text: '{{DRAFTER_NAME}}', matchCase: false },
        replaceText: drafterName,
      },
    })
    requests.push({
      replaceAllText: {
        containsText: { text: '{{APPROVER_NAME}}', matchCase: false },
        replaceText: approverName,
      },
    })

    // Ganti semua variabel spesifik dari contentData (case-insensitive keys)
    for (const [key, val] of Object.entries(contentData)) {
      const stringValue = String(val ?? '')
      requests.push({
        replaceAllText: {
          containsText: { text: `{{${key}}}`, matchCase: false },
          replaceText: stringValue,
        },
      })
      requests.push({
        replaceAllText: {
          containsText: { text: `{{${key.toUpperCase()}}}`, matchCase: false },
          replaceText: stringValue,
        },
      })
    }

    // 2b. Injeksi Gambar Tanda Tangan (jika signatureUrl tersedia)
    if (approverSignatureUrl && approverSignatureUrl.startsWith('http')) {
      try {
        // Ambil isi dokumen untuk mencari posisi placeholder {{TANDA_TANGAN}}
        const docRes = await docs.documents.get({ documentId: temporaryDocId })
        const targetPlaceholder = '{{TANDA_TANGAN}}'
        let offset = findPlaceholderOffset(docRes.data, targetPlaceholder)

        if (!offset) {
          offset = findPlaceholderOffset(docRes.data, '{{SIGNATURE}}')
        }

        if (offset) {
          // Hapus placeholder teks terlebih dahulu
          requests.push({
            deleteContentRange: {
              range: {
                startIndex: offset.startIndex,
                endIndex: offset.endIndex,
              },
            },
          })

          // Sisipkan gambar tanda tangan tepat di posisi offset tersebut
          requests.push({
            insertInlineImage: {
              location: { index: offset.startIndex },
              uri: approverSignatureUrl,
              objectSize: {
                height: { magnitude: 60, unit: 'PT' },
                width: { magnitude: 150, unit: 'PT' },
              },
            },
          })
        } else {
          // Jika tag {{TANDA_TANGAN}} tidak ditemukan, ganti teks fallback
          requests.push({
            replaceAllText: {
              containsText: { text: '{{TANDA_TANGAN}}', matchCase: false },
              replaceText: `[Tertanda: ${approverName}]`,
            },
          })
        }
      } catch (docInspectionErr) {
        logger.warn('Failed to inspect doc for inline image insertion, using text fallback', docInspectionErr)
        requests.push({
          replaceAllText: {
            containsText: { text: '{{TANDA_TANGAN}}', matchCase: false },
            replaceText: `[Tertanda: ${approverName}]`,
          },
        })
      }
    } else {
      // Tidak ada signatureUrl, ganti teks secara aman
      requests.push({
        replaceAllText: {
          containsText: { text: '{{TANDA_TANGAN}}', matchCase: false },
          replaceText: `[Tertanda: ${approverName}]`,
        },
      })
      requests.push({
        replaceAllText: {
          containsText: { text: '{{SIGNATURE}}', matchCase: false },
          replaceText: `[Tertanda: ${approverName}]`,
        },
      })
    }

    // Eksekusi batchUpdate ke Docs API
    await docs.documents.batchUpdate({
      documentId: temporaryDocId,
      requestBody: { requests },
    })

    logger.info(`BatchUpdate applied to document ${temporaryDocId} with ${requests.length} operations`)

    // -------------------------------------------------------------
    // LANGKAH 3: Ekspor PDF & Upload ke Firebase Cloud Storage
    // -------------------------------------------------------------
    const exportResponse = await drive.files.export(
      {
        fileId: temporaryDocId,
        mimeType: 'application/pdf',
      },
      { responseType: 'arraybuffer' }
    )

    const pdfBuffer = Buffer.from(exportResponse.data as ArrayBuffer)
    logger.info(`PDF exported successfully, size: ${pdfBuffer.length} bytes`)

    const bucket = getStorage().bucket(process.env.VITE_FIREBASE_STORAGE_BUCKET || undefined)
    const destination = `final_letters/${letterId}.pdf`
    const file = bucket.file(destination)

    await file.save(pdfBuffer, {
      contentType: 'application/pdf',
      metadata: {
        metadata: {
          letterId,
          letterNumber,
          renderedAt: new Date().toISOString(),
        },
      },
    })

    try {
      await file.makePublic()
    } catch {
      // Abaikan jika uniform bucket access aktif
    }

    const downloadUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`
    logger.info(`PDF uploaded to Storage: ${downloadUrl}`)

    // -------------------------------------------------------------
    // LANGKAH 4: Cleanup File Sementara di Drive & Update Database
    // -------------------------------------------------------------
    try {
      await drive.files.delete({ fileId: temporaryDocId })
      isCleanedUp = true
      logger.info(`Temporary Google Doc deleted: ${temporaryDocId}`)
    } catch (delErr) {
      logger.warn(`Could not delete temporary doc ${temporaryDocId}`, delErr)
    }

    await db.collection('letters').doc(letterId).update({
      status: 'Approved',
      finalPdfUrl: downloadUrl,
      pdfError: null,
      updatedAt: new Date().toISOString(),
    })

    logger.info(`Letter ${letterId} updated to status 'Approved' with PDF URL`)
    return downloadUrl
  } catch (error: any) {
    logger.error(`Error processing PDF for letter ${letterId}:`, error)

    // Update status surat di Firestore ke Error PDF agar UI menampilkan pesan error & opsi coba lagi
    try {
      await db.collection('letters').doc(letterId).update({
        status: 'Error PDF',
        pdfError: error?.message || 'Gagal merender PDF via Google Workspace APIs',
        updatedAt: new Date().toISOString(),
      })
    } catch (dbErr) {
      logger.error(`Failed to update letter ${letterId} to Error PDF:`, dbErr)
    }

    throw error
  } finally {
    // Pastikan dokumen sementara di Google Drive selalu terhapus jika belum
    if (temporaryDocId && !isCleanedUp) {
      try {
        const { drive } = getGoogleWorkspaceClients()
        await drive.files.delete({ fileId: temporaryDocId })
        logger.info(`Cleaned up temporary doc ${temporaryDocId} in finally block`)
      } catch (finallyDelErr) {
        // Silent catch on cleanup
      }
    }
  }
}
