import { google, drive_v3, docs_v1 } from 'googleapis'
import * as logger from 'firebase-functions/logger'

/**
 * Scopes required for Google Drive and Google Docs operations:
 * - drive: file creation, duplication, export to PDF, and cleanup
 * - documents: reading template contents and batchUpdate text/image insertion
 */
const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive',
]

export interface GoogleClients {
  drive: drive_v3.Drive
  docs: docs_v1.Docs
  isMockMode: boolean
}

let cachedClients: GoogleClients | null = null

/**
 * Parses and returns Google Auth credentials from environment variables.
 * Supports:
 * 1. GOOGLE_SERVICE_ACCOUNT_KEY (JSON string or base64 JSON)
 * 2. GOOGLE_SERVICE_ACCOUNT_EMAIL & GOOGLE_PRIVATE_KEY
 * 3. Default Application Credentials (GCP environment or GOOGLE_APPLICATION_CREDENTIALS)
 */
export function getGoogleWorkspaceAuth() {
  const explicitKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  const saEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const saPrivateKey = process.env.GOOGLE_PRIVATE_KEY

  if (explicitKey) {
    try {
      const decoded = explicitKey.startsWith('{')
        ? explicitKey
        : Buffer.from(explicitKey, 'base64').toString('utf8')
      const credentials = JSON.parse(decoded)
      logger.info('Using Service Account credentials from GOOGLE_SERVICE_ACCOUNT_KEY')
      return new google.auth.GoogleAuth({
        credentials,
        scopes: SCOPES,
      })
    } catch (err) {
      logger.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY JSON', err)
    }
  }

  if (saEmail && saPrivateKey) {
    logger.info('Using Service Account credentials from GOOGLE_SERVICE_ACCOUNT_EMAIL & GOOGLE_PRIVATE_KEY')
    return new google.auth.JWT({
      email: saEmail,
      key: saPrivateKey.replace(/\\n/g, '\n'),
      scopes: SCOPES,
    })
  }

  // Fallback to Application Default Credentials
  logger.info('Using Google Application Default Credentials (ADC)')
  return new google.auth.GoogleAuth({
    scopes: SCOPES,
  })
}

/**
 * Initializes and returns Google Workspace clients for Drive and Docs.
 */
export function getGoogleWorkspaceClients(): GoogleClients {
  if (cachedClients) {
    return cachedClients
  }

  const isMockMode =
    process.env.PDF_MOCK_MODE === 'true' ||
    process.env.NODE_ENV === 'test'

  try {
    const auth = getGoogleWorkspaceAuth()
    const drive = google.drive({ version: 'v3', auth: auth as any })
    const docs = google.docs({ version: 'v1', auth: auth as any })

    cachedClients = { drive, docs, isMockMode }
    return cachedClients
  } catch (error) {
    logger.warn('Could not initialize live Google Workspace client, falling back to mock mode if enabled:', error)
    if (isMockMode) {
      cachedClients = {
        drive: {} as any,
        docs: {} as any,
        isMockMode: true,
      }
      return cachedClients
    }
    throw error
  }
}
