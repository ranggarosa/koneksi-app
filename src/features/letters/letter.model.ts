export type LetterStatus = 'Draft' | 'In Review' | 'Approved' | 'Rejected'

export type LetterTemplateType = 'Surat Tugas' | 'SP 1' | 'SP 2'

export interface LetterTemplateConfig {
  type: string
  code: string // KODE_SURAT (misal: ST, SP1, SP2)
  label: string
}

export const LETTER_TEMPLATES: Record<string, LetterTemplateConfig> = {
  'Surat Tugas': { type: 'Surat Tugas', code: 'ST', label: 'Surat Tugas' },
  'SP 1': { type: 'SP 1', code: 'SP1', label: 'Surat Peringatan 1 (SP 1)' },
  'SP 2': { type: 'SP 2', code: 'SP2', label: 'Surat Peringatan 2 (SP 2)' },
}

export interface ApprovalStep {
  userId: string
  userName: string
  role: 'reviewer' | 'approver'
  status: 'pending' | 'approved' | 'rejected'
  notes?: string
  signedAt?: string
}

export interface Letter {
  letterId: string
  letterNumber: string
  templateType: string
  contentData: Record<string, string | number>
  status: LetterStatus
  drafterId: string
  drafterName: string
  approvalFlow: ApprovalStep[]
  finalPdfUrl?: string
  createdAt: string
  updatedAt: string
}

export interface Counter {
  counterId: string
  department: string
  month: number
  year: number
  currentSequence: number
  updatedAt?: string
}

export interface ApproverOption {
  uid: string
  name: string
  role: string
  department?: string
}

export interface CreateLetterDTO {
  templateType: string
  department?: string
  jenisSurat?: string
  contentData: Record<string, string | number>
  reviewerId?: string
  approverId: string
}

export interface LetterFilter {
  status?: LetterStatus
  templateType?: string
  search?: string
}
