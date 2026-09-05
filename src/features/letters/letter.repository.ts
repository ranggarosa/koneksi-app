import type { Letter, Counter } from './letter.model'

export interface ILetterRepository {
  findAll(): Promise<Letter[]>
  findById(id: string): Promise<Letter | null>
  create(letter: Omit<Letter, 'letterId'>): Promise<Letter>
  update(id: string, partial: Partial<Letter>): Promise<Letter>
  getNextSequence(department: string, month: number, year: number): Promise<number>
}

class LetterRepository implements ILetterRepository {
  private letters: Letter[] = [
    {
      letterId: 'ltr_001',
      letterNumber: '0051.ST/HR/IX/2026',
      templateType: 'Surat Tugas',
      contentData: {
        recipientName: 'Budi Santoso',
        recipientNik: '19890412001',
        destination: 'Bandung',
        purpose: 'Audit Lapangan Cabang',
        startDate: '2026-09-10',
        endDate: '2026-09-12',
      },
      status: 'Approved',
      drafterId: 'usr_001',
      drafterName: 'Ahmad Drafter',
      approvalFlow: [
        {
          userId: 'usr_002',
          userName: 'Siti Reviewer',
          role: 'reviewer',
          status: 'approved',
          notes: 'Dokumen lengkap dan sesuai ketentuan.',
        },
        {
          userId: 'usr_003',
          userName: 'Hendra Approver',
          role: 'approver',
          status: 'approved',
          signedAt: '2026-09-02T10:00:00Z',
        },
      ],
      finalPdfUrl: 'https://example.com/letters/0051-ST-HR-IX-2026.pdf',
      createdAt: '2026-09-01T08:30:00Z',
      updatedAt: '2026-09-02T10:00:00Z',
    },
    {
      letterId: 'ltr_002',
      letterNumber: '0052.SP1/HR/IX/2026',
      templateType: 'Surat Peringatan 1',
      contentData: {
        recipientName: 'Rian Pratama',
        recipientNik: '19920115004',
        violation: 'Keterlambatan berturut-turut melebihi batas toleransi',
        effectiveDate: '2026-09-05',
      },
      status: 'In Review',
      drafterId: 'usr_001',
      drafterName: 'Ahmad Drafter',
      approvalFlow: [
        {
          userId: 'usr_002',
          userName: 'Siti Reviewer',
          role: 'reviewer',
          status: 'pending',
        },
        {
          userId: 'usr_003',
          userName: 'Hendra Approver',
          role: 'approver',
          status: 'pending',
        },
      ],
      createdAt: '2026-09-04T11:00:00Z',
      updatedAt: '2026-09-04T11:00:00Z',
    },
    {
      letterId: 'ltr_003',
      letterNumber: '0053.SKK/HR/IX/2026',
      templateType: 'Surat Keterangan Kerja',
      contentData: {
        recipientName: 'Dewi Lestari',
        recipientNik: '19950720008',
        position: 'Senior UI Designer',
        joinDate: '2022-03-01',
      },
      status: 'Draft',
      drafterId: 'usr_001',
      drafterName: 'Ahmad Drafter',
      approvalFlow: [
        {
          userId: 'usr_002',
          userName: 'Siti Reviewer',
          role: 'reviewer',
          status: 'pending',
        },
        {
          userId: 'usr_003',
          userName: 'Hendra Approver',
          role: 'approver',
          status: 'pending',
        },
      ],
      createdAt: '2026-09-05T09:15:00Z',
      updatedAt: '2026-09-05T09:15:00Z',
    },
  ]

  private counters: Record<string, Counter> = {
    'HR_9_2026': {
      counterId: 'HR_9_2026',
      department: 'HR',
      month: 9,
      year: 2026,
      currentSequence: 53,
    },
  }

  async findAll(): Promise<Letter[]> {
    await new Promise((resolve) => setTimeout(resolve, 200))
    return [...this.letters]
  }

  async findById(id: string): Promise<Letter | null> {
    await new Promise((resolve) => setTimeout(resolve, 150))
    const item = this.letters.find((l) => l.letterId === id)
    return item ? { ...item } : null
  }

  async create(letterData: Omit<Letter, 'letterId'>): Promise<Letter> {
    await new Promise((resolve) => setTimeout(resolve, 250))
    const newLetter: Letter = {
      ...letterData,
      letterId: `ltr_${Date.now()}`,
    }
    this.letters.unshift(newLetter)
    return newLetter
  }

  async update(id: string, partial: Partial<Letter>): Promise<Letter> {
    await new Promise((resolve) => setTimeout(resolve, 200))
    const index = this.letters.findIndex((l) => l.letterId === id)
    if (index === -1) {
      throw new Error(`Surat dengan id ${id} tidak ditemukan`)
    }
    const updated = {
      ...this.letters[index],
      ...partial,
      updatedAt: new Date().toISOString(),
    }
    this.letters[index] = updated
    return updated
  }

  async getNextSequence(department: string, month: number, year: number): Promise<number> {
    await new Promise((resolve) => setTimeout(resolve, 150))
    const counterKey = `${department}_${month}_${year}`
    const existing = this.counters[counterKey]
    const nextSeq = existing ? existing.currentSequence + 1 : 1

    this.counters[counterKey] = {
      counterId: counterKey,
      department,
      month,
      year,
      currentSequence: nextSeq,
    }
    return nextSeq
  }
}

export const letterRepository = new LetterRepository()
