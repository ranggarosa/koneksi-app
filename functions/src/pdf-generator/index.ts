/**
 * PDF Generator Module (Google Workspace APIs)
 * Stub implementation for server-side mail merge & PDF export via Google Docs and Drive APIs.
 */

export interface GeneratePdfOptions {
  letterId: string
  googleDocTemplateId: string
  contentData: Record<string, unknown>
  letterNumber: string
}

export async function generatePdfFromGoogleDoc(options: GeneratePdfOptions): Promise<string> {
  // TODO: Integrasi penuh Google Docs API & Google Drive API akan diimplementasikan pada issue berikutnya.
  console.log(`[STUB] generatePdfFromGoogleDoc called for letterId: ${options.letterId}`);
  return `https://storage.googleapis.com/koneksi-app-dev.appspot.com/letters/${options.letterId}.pdf`;
}
