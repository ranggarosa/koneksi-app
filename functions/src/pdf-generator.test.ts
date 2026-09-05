import { generatePdfFromGoogleDoc } from './pdf-generator'
import * as googleClientModule from './google-client'
import * as firestoreModule from 'firebase-admin/firestore'
import * as storageModule from 'firebase-admin/storage'

// 100% Mocking of all external services (Google APIs, Firebase Firestore, Firebase Storage)
jest.mock('./google-client')
jest.mock('firebase-admin/firestore')
jest.mock('firebase-admin/storage')

describe('Cloud Functions - Google Workspace PDF Generator Engine', () => {
  let mockDrive: any
  let mockDocs: any
  let mockDocUpdate: jest.Mock
  let mockStorageSave: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

    mockDrive = {
      files: {
        copy: jest.fn().mockResolvedValue({
          data: { id: 'temp_doc_generated_123', name: 'Letter_001_test' },
        }),
        export: jest.fn().mockResolvedValue({
          data: Buffer.from('%PDF-1.4 mock pdf data'),
        }),
        delete: jest.fn().mockResolvedValue({ data: {} }),
      },
    }

    mockDocs = {
      documents: {
        get: jest.fn().mockResolvedValue({
          data: {
            body: {
              content: [
                {
                  paragraph: {
                    elements: [
                      {
                        startIndex: 100,
                        textRun: { content: 'Tanda tangan di sini: {{TANDA_TANGAN}}' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        }),
        batchUpdate: jest.fn().mockResolvedValue({ data: {} }),
      },
    }

    mockDocUpdate = jest.fn().mockResolvedValue({})
    mockStorageSave = jest.fn().mockResolvedValue({})

    // Mock getGoogleWorkspaceClients
    jest.spyOn(googleClientModule, 'getGoogleWorkspaceClients').mockReturnValue({
      drive: mockDrive,
      docs: mockDocs,
      isMockMode: false,
    })

    // Mock Firestore
    jest.spyOn(firestoreModule, 'getFirestore').mockReturnValue({
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          update: mockDocUpdate,
        }),
      }),
    } as any)

    // Mock Cloud Storage
    jest.spyOn(storageModule, 'getStorage').mockReturnValue({
      bucket: jest.fn().mockReturnValue({
        name: 'koneksi-test-bucket',
        file: jest.fn().mockReturnValue({
          name: 'final_letters/ltr_999.pdf',
          save: mockStorageSave,
          makePublic: jest.fn().mockResolvedValue({}),
        }),
      }),
    } as any)
  })

  it('successfully completes 4-step pipeline: copy, batchUpdate, export, and cleanup when letter is approved', async () => {
    const pdfUrl = await generatePdfFromGoogleDoc({
      letterId: 'ltr_999',
      googleDocTemplateId: 'template_master_doc_id',
      contentData: { NAMA: 'Budi Hartono', NIK: '12345678' },
      letterNumber: '001/ST/HR/IX/2026',
      drafterName: 'Rangga Drafter',
      approverName: 'Dr. Hendra',
      approverSignatureUrl: 'https://example.com/signatures/hendra.png',
      createdAt: '2026-09-05T08:00:00Z',
    })

    // 1. Google Drive copy MUST have been called exactly once
    expect(mockDrive.files.copy).toHaveBeenCalledTimes(1)
    expect(mockDrive.files.copy).toHaveBeenCalledWith(
      expect.objectContaining({
        fileId: 'template_master_doc_id',
      })
    )

    // 2. Google Docs batchUpdate MUST have been called exactly once with replaced text & inline image
    expect(mockDocs.documents.batchUpdate).toHaveBeenCalledTimes(1)
    expect(mockDocs.documents.batchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: 'temp_doc_generated_123',
        requestBody: expect.objectContaining({
          requests: expect.arrayContaining([
            expect.objectContaining({
              replaceAllText: expect.objectContaining({
                replaceText: '001/ST/HR/IX/2026',
              }),
            }),
            expect.objectContaining({
              insertInlineImage: expect.objectContaining({
                uri: 'https://example.com/signatures/hendra.png',
              }),
            }),
          ]),
        }),
      })
    )

    // 3. Google Drive export to PDF MUST have been called exactly once
    expect(mockDrive.files.export).toHaveBeenCalledTimes(1)
    expect(mockDrive.files.export).toHaveBeenCalledWith(
      expect.objectContaining({
        fileId: 'temp_doc_generated_123',
        mimeType: 'application/pdf',
      }),
      expect.any(Object)
    )

    // 4. Temporary document in Google Drive MUST be deleted
    expect(mockDrive.files.delete).toHaveBeenCalledTimes(1)
    expect(mockDrive.files.delete).toHaveBeenCalledWith({
      fileId: 'temp_doc_generated_123',
    })

    // 5. Firestore status MUST be updated to "Approved" with finalPdfUrl
    expect(mockDocUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'Approved',
        finalPdfUrl: expect.stringContaining('final_letters/ltr_999.pdf'),
        pdfError: null,
      })
    )

    expect(pdfUrl).toContain('final_letters/ltr_999.pdf')
  })

  it('catches Google API errors, transitions Firestore status to "Error PDF", and still cleans up temporary doc', async () => {
    // Simulate error during batchUpdate
    mockDocs.documents.batchUpdate.mockRejectedValue(
      new Error('Google Docs API quota exceeded')
    )

    await expect(
      generatePdfFromGoogleDoc({
        letterId: 'ltr_fail_100',
        googleDocTemplateId: 'template_master_doc_id',
        contentData: {},
        letterNumber: '002/ST/HR/IX/2026',
      })
    ).rejects.toThrow('Google Docs API quota exceeded')

    // Firestore status MUST transition to "Error PDF"
    expect(mockDocUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'Error PDF',
        pdfError: 'Google Docs API quota exceeded',
      })
    )

    // Temporary Google Doc must still be deleted in finally block
    expect(mockDrive.files.delete).toHaveBeenCalledWith({
      fileId: 'temp_doc_generated_123',
    })
  })
})
