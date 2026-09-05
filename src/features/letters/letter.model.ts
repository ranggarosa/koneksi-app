export type LetterStatus = 'Draft' | 'In Review' | 'Approved' | 'Rejected'

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
}

export interface CreateLetterDTO {
  templateType: string
  department: string
  contentData: Record<string, string | number>
  reviewerId: string
  approverId: string
}

export interface LetterFilter {
  status?: LetterStatus
  templateType?: string
  search?: string
}
