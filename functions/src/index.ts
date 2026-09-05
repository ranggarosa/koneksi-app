import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import * as logger from 'firebase-functions/logger'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { generatePdfFromGoogleDoc } from './pdf-generator'

if (getApps().length === 0) {
  initializeApp()
}

/**
 * Cloud Function Trigger: onLetterApproved
 * Mendengarkan pembaruan dokumen pada koleksi 'letters'.
 * Ketika status surat bertransisi ke 'Processing PDF', fungsi ini memicu integrasi
 * Google Workspace APIs (Google Drive & Google Docs) untuk melakukan mail merge,
 * menyuntikkan E-Signature, dan mengonversi hasil ke file PDF di Cloud Storage.
 */
export const onLetterApproved = onDocumentUpdated('letters/{letterId}', async (event) => {
  const newData = event.data?.after.data()
  const previousData = event.data?.before.data()

  // Hanya proses jika status sekarang 'Processing PDF' dan sebelumnya BUKAN 'Processing PDF'
  if (newData && newData.status === 'Processing PDF' && previousData?.status !== 'Processing PDF') {
    const letterId = event.params.letterId
    logger.info(`Processing PDF triggered for letter: ${letterId}`, {
      letterNumber: newData.letterNumber,
      templateType: newData.templateType,
      googleDocTemplateId: newData.googleDocTemplateId,
    })

    if (!newData.googleDocTemplateId) {
      const db = getFirestore()
      const errorMsg = `Surat ${letterId} tidak memiliki googleDocTemplateId yang valid`
      logger.error(errorMsg)
      await db.collection('letters').doc(letterId).update({
        status: 'Error_PDF',
        pdfError: errorMsg,
        updatedAt: new Date().toISOString(),
      })
      return
    }

    // Ekstraksi info approver terakhir & tanda tangan jika ada
    let approverName = 'Pejabat Berwenang'
    let approverSignatureUrl: string | undefined = undefined

    if (Array.isArray(newData.approvalFlow)) {
      const approverStep = [...newData.approvalFlow]
        .reverse()
        .find((step: any) => step.role === 'approver' && step.status === 'approved')

      if (approverStep) {
        approverName = approverStep.userName || approverName

        // Ambil signatureUrl dari profil user approver di koleksi 'users' jika ada
        if (approverStep.userId) {
          try {
            const db = getFirestore()
            const userSnap = await db.collection('users').doc(approverStep.userId).get()
            if (userSnap.exists) {
              const userData = userSnap.data()
              approverSignatureUrl = userData?.signatureUrl
            }
          } catch (userErr) {
            logger.warn(`Could not fetch signatureUrl for user ${approverStep.userId}`, userErr)
          }
        }
      }
    }

    try {
      await generatePdfFromGoogleDoc({
        letterId,
        googleDocTemplateId: newData.googleDocTemplateId,
        contentData: newData.contentData || {},
        letterNumber: newData.letterNumber,
        drafterName: newData.drafterName,
        approverName,
        approverSignatureUrl,
        createdAt: newData.createdAt,
      })
    } catch (err: any) {
      logger.error(`Unhandled error during generatePdfFromGoogleDoc for letter ${letterId}:`, err)
      // Status update sudah ditangani di dalam generatePdfFromGoogleDoc
    }
  }
})

export * from './pdf-generator'
export * from './google-client'
