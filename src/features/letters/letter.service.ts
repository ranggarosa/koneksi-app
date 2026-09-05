import type { ILetterRepository } from './letter.repository'
import { letterRepository } from './letter.repository'
import type { Letter, LetterStatus, CreateLetterDTO } from './letter.model'

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

export class LetterService {
  constructor(private readonly repo: ILetterRepository) {}

  async getAllLetters(): Promise<Letter[]> {
    return this.repo.findAll()
  }

  async getLetterById(id: string): Promise<Letter | null> {
    return this.repo.findById(id)
  }

  formatLetterNumber(sequence: number, categoryCode: string, department: string, date: Date = new Date()): string {
    const seqStr = String(sequence).padStart(4, '0')
    const romanMonth = ROMAN_MONTHS[date.getMonth()]
    const year = date.getFullYear()
    return `${seqStr}.${categoryCode}/${department}/${romanMonth}/${year}`
  }

  async createLetterDraft(dto: CreateLetterDTO, drafterId: string, drafterName: string): Promise<Letter> {
    if (!dto.templateType) {
      throw new Error('Jenis template surat wajib dipilih')
    }
    if (!dto.contentData || Object.keys(dto.contentData).length === 0) {
      throw new Error('Data konten surat tidak boleh kosong')
    }

    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()
    const dept = dto.department || 'HR'

    // Get auto-increment sequence via repository (simulating transaction counter)
    const nextSeq = await this.repo.getNextSequence(dept, month, year)

    // Resolve template code
    const categoryCode = dto.templateType.includes('Tugas')
      ? 'ST'
      : dto.templateType.includes('Peringatan')
      ? 'SP1'
      : 'SKK'

    const letterNumber = this.formatLetterNumber(nextSeq, categoryCode, dept, now)

    const newLetterData: Omit<Letter, 'letterId'> = {
      letterNumber,
      templateType: dto.templateType,
      contentData: dto.contentData,
      status: 'In Review', // submitted for review immediately
      drafterId,
      drafterName,
      approvalFlow: [
        {
          userId: dto.reviewerId || 'usr_002',
          userName: 'Siti Reviewer',
          role: 'reviewer',
          status: 'pending',
        },
        {
          userId: dto.approverId || 'usr_003',
          userName: 'Hendra Approver',
          role: 'approver',
          status: 'pending',
        },
      ],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }

    return this.repo.create(newLetterData)
  }

  async processApproval(letterId: string, reviewerOrApproverId: string, action: 'approve' | 'reject', notes?: string): Promise<Letter> {
    const letter = await this.repo.findById(letterId)
    if (!letter) {
      throw new Error('Surat tidak ditemukan')
    }

    const flow = [...letter.approvalFlow]
    const stepIndex = flow.findIndex((step) => step.userId === reviewerOrApproverId && step.status === 'pending')

    if (stepIndex === -1) {
      throw new Error('Pengguna tidak memiliki antrean persetujuan pada dokumen ini')
    }

    flow[stepIndex] = {
      ...flow[stepIndex],
      status: action === 'approve' ? 'approved' : 'rejected',
      notes: notes || undefined,
      signedAt: action === 'approve' ? new Date().toISOString() : undefined,
    }

    let nextStatus: LetterStatus = letter.status
    if (action === 'reject') {
      nextStatus = 'Rejected'
    } else {
      const allApproved = flow.every((step) => step.status === 'approved')
      nextStatus = allApproved ? 'Approved' : 'In Review'
    }

    return this.repo.update(letterId, {
      approvalFlow: flow,
      status: nextStatus,
      finalPdfUrl: nextStatus === 'Approved' ? `https://storage.koneksi.app/letters/${letter.letterNumber.replace(/\//g, '-')}.pdf` : undefined,
    })
  }

  calculateMetrics(letters: Letter[]) {
    return {
      total: letters.length,
      draftCount: letters.filter((l) => l.status === 'Draft').length,
      inReviewCount: letters.filter((l) => l.status === 'In Review').length,
      approvedCount: letters.filter((l) => l.status === 'Approved').length,
      rejectedCount: letters.filter((l) => l.status === 'Rejected').length,
    }
  }
}

export const letterService = new LetterService(letterRepository)
