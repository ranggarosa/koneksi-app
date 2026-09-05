import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import * as logger from 'firebase-functions/logger'
import { initializeApp } from 'firebase-admin/app'
import { generatePdfFromGoogleDoc } from './pdf-generator'

initializeApp()

/**
 * Cloud Function Trigger: onLetterApproved
 * Mendengarkan perubahan dokumen pada collection 'letters'.
 * Jika status dokumen berubah menjadi 'Processing PDF', pemicu pemrosesan Google Workspace PDF Engine diaktifkan.
 */
export const onLetterApproved = onDocumentUpdated('letters/{letterId}', async (event) => {
  const newData = event.data?.after.data()
  const previousData = event.data?.before.data()

  if (newData && newData.status === 'Processing PDF' && previousData?.status !== 'Processing PDF') {
    const letterId = event.params.letterId
    logger.info(`Triggered PDF Processing for: ${letterId}`, {
      letterId,
      letterNumber: newData.letterNumber,
      templateType: newData.templateType,
      googleDocTemplateId: newData.googleDocTemplateId || null,
    })

    // Stub call ke pdf-generator
    if (newData.googleDocTemplateId) {
      await generatePdfFromGoogleDoc({
        letterId,
        googleDocTemplateId: newData.googleDocTemplateId,
        contentData: newData.contentData || {},
        letterNumber: newData.letterNumber,
      })
    }
    // TODO: Integrasi penuh Google Docs & Drive API akan diimplementasikan pada issue berikutnya
  }
})

export * from './pdf-generator'
