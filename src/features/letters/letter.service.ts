import type { ILetterRepository } from './letter.repository'
import { letterRepository } from './letter.repository'
import type { Letter, LetterStatus, CreateLetterDTO, ApproverOption } from './letter.model'

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

export class LetterService {
  constructor(private readonly repo: ILetterRepository) {}

  async getAllLetters(): Promise<Letter[]> {
    return this.repo.findAll()
  }

  async getLetterById(id: string): Promise<Letter | null> {
    return this.repo.findById(id)
  }

  async getApprovalOptions(): Promise<{ reviewers: ApproverOption[]; approvers: ApproverOption[] }> {
    return this.repo.getApprovalCandidates()
  }

  formatLetterNumber(sequence: number, categoryCode: string, department: string, date: Date = new Date()): string {
    const seqStr = String(sequence).padStart(4, '0')
    const romanMonth = ROMAN_MONTHS[date.getMonth()]
    const year = date.getFullYear()
    return `${seqStr}.${categoryCode}/${department}/${romanMonth}/${year}`
  }

  validateLetterPayload(dto: CreateLetterDTO): void {
    if (!dto.templateType) {
      throw new Error('Kategori / Template surat wajib dipilih')
    }

    const { contentData } = dto
    if (!contentData) {
      throw new Error('Data formulir surat tidak boleh kosong')
    }

    // Common required fields
    if (!contentData.recipientName || String(contentData.recipientName).trim() === '') {
      throw new Error('Nama penerima / karyawan wajib diisi')
    }

    if (!contentData.recipientNik || String(contentData.recipientNik).trim() === '') {
      throw new Error('NIK karyawan wajib diisi')
    }

    if (!contentData.position || String(contentData.position).trim() === '') {
      throw new Error('Jabatan karyawan wajib diisi')
    }

    // Template specific validations
    if (dto.templateType === 'Surat Tugas') {
      if (!contentData.destination || String(contentData.destination).trim() === '') {
        throw new Error('Kota atau lokasi tujuan penugasan wajib diisi untuk Surat Tugas')
      }
      if (!contentData.purpose || String(contentData.purpose).trim() === '') {
        throw new Error('Keperluan / agenda penugasan wajib diisi untuk Surat Tugas')
      }
      if (!contentData.startDate) {
        throw new Error('Tanggal mulai penugasan wajib diisi')
      }
      if (!contentData.endDate) {
        throw new Error('Tanggal berakhir penugasan wajib diisi')
      }
    } else if (dto.templateType === 'SP 1' || dto.templateType === 'SP 2') {
      if (!contentData.violationReason || String(contentData.violationReason).trim() === '') {
        throw new Error(`Uraian alasan pelanggaran wajib diisi untuk ${dto.templateType}`)
      }
      if (!contentData.violationDate) {
        throw new Error('Tanggal terjadinya pelanggaran wajib diisi')
      }
      if (!contentData.effectiveDate) {
        throw new Error('Tanggal mulai berlakunya sanksi peringatan wajib diisi')
      }
    }

    // Approver validation: Must have at least 1 approver selected
    if (!dto.approverId || String(dto.approverId).trim() === '') {
      throw new Error('Minimal harus memilih 1 Petugas Approver Final')
    }
  }

  async createLetterDraft(
    dto: CreateLetterDTO,
    drafterId: string,
    drafterName: string,
    candidateUsers?: { reviewers: ApproverOption[]; approvers: ApproverOption[] }
  ): Promise<Letter> {
    this.validateLetterPayload(dto)

    const now = new Date()
    const nowIso = now.toISOString()
    const dept = dto.department || 'HR'

    // Format draft identifier
    const templateCode = dto.templateType === 'Surat Tugas'
      ? 'ST'
      : dto.templateType === 'SP 1'
      ? 'SP1'
      : dto.templateType === 'SP 2'
      ? 'SP2'
      : 'LTR'
    const draftNumber = `DRAFT-${templateCode}/${dept}/${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Date.now().toString().slice(-4)}`

    // Build approval flow steps
    const candidates = candidateUsers || (await this.repo.getApprovalCandidates())
    const approvalFlow: Letter['approvalFlow'] = []

    if (dto.reviewerId) {
      const reviewerUser = candidates.reviewers.find((r) => r.uid === dto.reviewerId)
      approvalFlow.push({
        userId: dto.reviewerId,
        userName: reviewerUser ? reviewerUser.name : 'Petugas Reviewer',
        role: 'reviewer',
        status: 'pending',
      })
    }

    const approverUser = candidates.approvers.find((a) => a.uid === dto.approverId)
    approvalFlow.push({
      userId: dto.approverId,
      userName: approverUser ? approverUser.name : 'Petugas Approver Final',
      role: 'approver',
      status: 'pending',
    })

    const newLetterData: Omit<Letter, 'letterId'> = {
      letterNumber: draftNumber,
      templateType: dto.templateType,
      contentData: dto.contentData,
      status: 'In Review',
      drafterId,
      drafterName,
      approvalFlow,
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    return this.repo.create(newLetterData)
  }

  async processApproval(
    letterId: string,
    reviewerOrApproverId: string,
    action: 'approve' | 'reject',
    notes?: string
  ): Promise<Letter> {
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
      finalPdfUrl:
        nextStatus === 'Approved'
          ? `https://storage.koneksi.app/letters/${letter.letterNumber.replace(/\//g, '-')}.pdf`
          : undefined,
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
