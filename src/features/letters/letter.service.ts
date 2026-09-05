import type { ILetterRepository } from './letter.repository'
import { letterRepository } from './letter.repository'
import type { ICounterRepository } from './counter.repository'
import { counterRepository } from './counter.repository'
import type { IEmailNotificationService } from './email-notification.service'
import { emailNotificationService } from './email-notification.service'
import type { Letter, LetterStatus, CreateLetterDTO, ApproverOption, BookLetterNumberDTO } from './letter.model'
import { LETTER_TEMPLATES } from './letter.model'

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

export class LetterService {
  constructor(
    private readonly repo: ILetterRepository,
    private readonly counterRepo: ICounterRepository = counterRepository,
    private readonly notificationService: IEmailNotificationService = emailNotificationService
  ) {}

  async getAllLetters(): Promise<Letter[]> {
    return this.repo.findAll()
  }

  async getLetterById(id: string): Promise<Letter | null> {
    return this.repo.findById(id)
  }

  async getApprovalOptions(): Promise<{ reviewers: ApproverOption[]; approvers: ApproverOption[] }> {
    return this.repo.getApprovalCandidates()
  }

  /**
   * Format penomoran surat resmi: [NOMOR_URUT].[KODE_SURAT]/[BULAN_ROMAWI]/[TAHUN]
   * Contoh: 0051.SP1/IX/2026, 0001.ST/IX/2026
   */
  formatLetterNumber(sequence: number, letterCode: string, date: Date = new Date()): string {
    const seqStr = String(sequence).padStart(4, '0')
    const romanMonth = ROMAN_MONTHS[date.getMonth()]
    const year = date.getFullYear()
    return `${seqStr}.${letterCode}/${romanMonth}/${year}`
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
    const month = now.getMonth() + 1
    const year = now.getFullYear()
    const dept = 'HR'

    // Ambil KODE_SURAT dari konfigurasi Template surat yang dipilih
    const templateConfig = LETTER_TEMPLATES[dto.templateType]
    const letterCode = templateConfig ? templateConfig.code : 'LTR'
    const googleDocTemplateId = dto.googleDocTemplateId || templateConfig?.googleDocTemplateId

    // Ambil nomor urut atomic dari Firestore Transactions
    const nextSequence = await this.counterRepo.getNextSequenceNumber(dept, month, year)

    // Rangkai nomor resmi: [NOMOR_URUT].[KODE_SURAT]/[BULAN_ROMAWI]/[TAHUN]
    const letterNumber = this.formatLetterNumber(nextSequence, letterCode, now)

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
      letterNumber,
      templateType: dto.templateType,
      googleDocTemplateId,
      contentData: {
        ...dto.contentData,
        jenisSurat: dto.jenisSurat || dto.contentData.jenisSurat || 'Surat Internal',
      },
      status: 'In Review',
      drafterId,
      drafterName,
      approvalFlow,
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    const createdLetter = await this.repo.create(newLetterData)

    // Trigger notifikasi email ke pihak pertama di alur persetujuan
    if (createdLetter.approvalFlow.length > 0) {
      const firstPerson = createdLetter.approvalFlow[0]
      await this.notificationService.notifyNextApprover(
        { name: firstPerson.userName, role: firstPerson.role },
        createdLetter.letterNumber,
        createdLetter.templateType
      )
    }

    return createdLetter
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

    if (letter.status !== 'In Review' && letter.status !== 'Draft') {
      throw new Error(`Surat tidak dapat diproses karena statusnya sudah "${letter.status}"`)
    }

    const flow = [...letter.approvalFlow]
    const pendingStepIndex = flow.findIndex((step) => step.status === 'pending')

    if (pendingStepIndex === -1) {
      throw new Error('Tidak ada antrean persetujuan yang menunggu pada dokumen ini')
    }

    const currentPendingStep = flow[pendingStepIndex]

    // Validasi giliran persetujuan: Pengguna yang memproses harus pemilik giliran saat ini atau admin
    if (
      currentPendingStep.userId !== reviewerOrApproverId &&
      reviewerOrApproverId !== 'admin' &&
      !reviewerOrApproverId.includes(currentPendingStep.role)
    ) {
      throw new Error(
        `Bukan giliran Anda untuk memproses dokumen ini. Saat ini menunggu persetujuan dari ${currentPendingStep.userName} (${currentPendingStep.role})`
      )
    }

    flow[pendingStepIndex] = {
      ...currentPendingStep,
      status: action === 'approve' ? 'approved' : 'rejected',
      notes: notes?.trim() || undefined,
      signedAt: action === 'approve' ? new Date().toISOString() : undefined,
    }

    let nextStatus: LetterStatus = letter.status
    if (action === 'reject') {
      nextStatus = 'Rejected'
      // Notifikasi penolakan ke Drafter
      await this.notificationService.notifyLetterRejected(
        { name: letter.drafterName },
        letter.letterNumber,
        currentPendingStep.userName,
        notes
      )
    } else {
      const nextPendingIndex = flow.findIndex((step) => step.status === 'pending')
      if (nextPendingIndex !== -1) {
        nextStatus = 'In Review'
        const nextPerson = flow[nextPendingIndex]
        // Notifikasi ke approver berikutnya dalam antrean
        await this.notificationService.notifyNextApprover(
          { name: nextPerson.userName, role: nextPerson.role },
          letter.letterNumber,
          letter.templateType
        )
      } else {
        // Seluruh approver telah menyetujui -> Status dialihkan ke 'Processing PDF'
        // agar Cloud Functions mengeksekusi Google Docs API & Google Drive API
        nextStatus = 'Processing PDF'
        await this.notificationService.notifyApprovalComplete(
          { name: letter.drafterName },
          letter.letterNumber,
          letter.templateType
        )
      }
    }

    return this.repo.update(letterId, {
      approvalFlow: flow,
      status: nextStatus,
    })
  }

  validateBookingPayload(dto: BookLetterNumberDTO): void {
    if (!dto.templateType || String(dto.templateType).trim() === '') {
      throw new Error('Kategori / Jenis surat wajib dipilih')
    }

    if (!dto.purpose || String(dto.purpose).trim() === '') {
      throw new Error('Deskripsi atau keperluan surat wajib diisi')
    }

    if (!dto.issuedDate || String(dto.issuedDate).trim() === '') {
      throw new Error('Tanggal penerbitan surat wajib diisi')
    }
  }

  async bookLetterNumber(
    dto: BookLetterNumberDTO,
    userId: string,
    userName: string
  ): Promise<Letter> {
    this.validateBookingPayload(dto)

    const issuedDateObj = new Date(dto.issuedDate)
    const validDate = isNaN(issuedDateObj.getTime()) ? new Date() : issuedDateObj
    const month = validDate.getMonth() + 1
    const year = validDate.getFullYear()
    const dept = 'HR'

    const templateConfig = LETTER_TEMPLATES[dto.templateType]
    const letterCode = templateConfig ? templateConfig.code : 'LTR'

    // Ambil sequence atomic dari counter repository
    const nextSequence = await this.counterRepo.getNextSequenceNumber(dept, month, year)
    const letterNumber = this.formatLetterNumber(nextSequence, letterCode, validDate)
    const nowIso = new Date().toISOString()

    const bookedLetterData: Omit<Letter, 'letterId'> = {
      letterNumber,
      templateType: dto.templateType,
      contentData: {
        purpose: dto.purpose,
        issuedDate: dto.issuedDate,
        isStandaloneBooking: 'true',
      },
      status: 'Booked',
      drafterId: userId,
      drafterName: userName,
      approvalFlow: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    return this.repo.create(bookedLetterData)
  }

  async retryPdfProcessing(letterId: string): Promise<Letter> {
    const letter = await this.repo.findById(letterId)
    if (!letter) {
      throw new Error('Surat tidak ditemukan')
    }

    if (letter.status !== 'Error PDF') {
      throw new Error(`Hanya surat dengan status Error PDF yang dapat diproses ulang (status saat ini: ${letter.status})`)
    }

    return this.repo.update(letterId, {
      status: 'Processing PDF',
      pdfError: undefined,
      updatedAt: new Date().toISOString(),
    })
  }

  calculateMetrics(letters: Letter[]) {
    return {
      total: letters.length,
      draftCount: letters.filter((l) => l.status === 'Draft').length,
      inReviewCount: letters.filter((l) => l.status === 'In Review').length,
      approvedCount: letters.filter((l) => l.status === 'Approved').length,
      rejectedCount: letters.filter((l) => l.status === 'Rejected').length,
      bookedCount: letters.filter((l) => l.status === 'Booked').length,
      processingPdfCount: letters.filter((l) => l.status === 'Processing PDF').length,
      errorPdfCount: letters.filter((l) => l.status === 'Error PDF').length,
    }
  }
}

export const letterService = new LetterService(letterRepository, counterRepository)
