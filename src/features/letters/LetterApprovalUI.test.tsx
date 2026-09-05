import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LetterDetailView } from './LetterDetailView'
import * as authController from '@/features/auth/auth.controller'
import * as detailController from './letter-detail.controller'
import type { Letter } from './letter.model'

vi.mock('@/features/auth/auth.controller')
vi.mock('./letter-detail.controller')

describe('Approval UI (LetterDetailView)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const baseLetter: Letter = {
    letterId: 'ltr_test_100',
    letterNumber: '001/ST/HR/IX/2026',
    templateType: 'Surat Tugas',
    contentData: { nama: 'Andi' },
    status: 'In Review',
    drafterId: 'drafter_01',
    drafterName: 'Rangga Drafter',
    createdAt: '2026-09-05T08:00:00Z',
    updatedAt: '2026-09-05T08:00:00Z',
    approvalFlow: [
      {
        userId: 'rev_01',
        userName: 'Reviewer Satu',
        role: 'reviewer',
        status: 'approved',
        signedAt: '2026-09-05T09:00:00Z',
      },
      {
        userId: 'app_01',
        userName: 'Approver Final',
        role: 'approver',
        status: 'pending',
      },
    ],
  }

  it('RENDERS Approve and Reject buttons when current user turn is pending and prior step is approved', () => {
    // Current user is Approver Final (whose turn is pending)
    vi.spyOn(authController, 'useAuthController').mockReturnValue({
      user: {
        uid: 'app_01',
        name: 'Approver Final',
        role: 'approver',
        email: 'approver@example.com',
        createdAt: '2026-09-05T00:00:00Z',
      },
      loading: false,
    } as any)

    vi.spyOn(detailController, 'useLetterDetailController').mockReturnValue({
      letter: baseLetter,
      loading: false,
      actionLoading: false,
      error: null,
      feedbackMsg: null,
      clearFeedback: vi.fn(),
      handleAction: vi.fn(),
      handleRetryPdf: vi.fn(),
    } as any)

    render(
      <MemoryRouter>
        <LetterDetailView />
      </MemoryRouter>
    )

    // Action buttons must be visible
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument()
  })

  it('HIDES Approve and Reject buttons when current user has ALREADY approved', () => {
    // Current user is Reviewer Satu (who already approved)
    vi.spyOn(authController, 'useAuthController').mockReturnValue({
      user: {
        uid: 'rev_01',
        name: 'Reviewer Satu',
        role: 'reviewer',
        email: 'reviewer@example.com',
        createdAt: '2026-09-05T00:00:00Z',
      },
      loading: false,
    } as any)

    vi.spyOn(detailController, 'useLetterDetailController').mockReturnValue({
      letter: baseLetter,
      loading: false,
      actionLoading: false,
      error: null,
      feedbackMsg: null,
      clearFeedback: vi.fn(),
      handleAction: vi.fn(),
      handleRetryPdf: vi.fn(),
    } as any)

    render(
      <MemoryRouter>
        <LetterDetailView />
      </MemoryRouter>
    )

    // Action buttons must NOT be present
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument()

    // Must show waiting indicator for the other person
    expect(screen.getByText(/Menunggu Peninjauan/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Approver Final/i).length).toBeGreaterThanOrEqual(1)
  })

  it('HIDES Approve and Reject buttons when status is Processing PDF', () => {
    const processingLetter: Letter = {
      ...baseLetter,
      status: 'Processing PDF',
      approvalFlow: [
        {
          userId: 'rev_01',
          userName: 'Reviewer Satu',
          role: 'reviewer',
          status: 'approved',
        },
        {
          userId: 'app_01',
          userName: 'Approver Final',
          role: 'approver',
          status: 'approved',
        },
      ],
    }

    vi.spyOn(authController, 'useAuthController').mockReturnValue({
      user: {
        uid: 'app_01',
        name: 'Approver Final',
        role: 'approver',
        email: 'approver@example.com',
        createdAt: '2026-09-05T00:00:00Z',
      },
      loading: false,
    } as any)

    vi.spyOn(detailController, 'useLetterDetailController').mockReturnValue({
      letter: processingLetter,
      loading: false,
      actionLoading: false,
      error: null,
      feedbackMsg: null,
      clearFeedback: vi.fn(),
      handleAction: vi.fn(),
      handleRetryPdf: vi.fn(),
    } as any)

    render(
      <MemoryRouter>
        <LetterDetailView />
      </MemoryRouter>
    )

    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument()
    expect(screen.getByText(/Dokumen Sedang Diproses Server/i)).toBeInTheDocument()
  })
})
