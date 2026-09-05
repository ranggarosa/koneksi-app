import { useState, useEffect } from 'react'
import type { Letter } from './letter.model'
import { letterService } from './letter.service'
import { letterRepository } from './letter.repository'

export function useLetterDetailController(letterId?: string) {
  const [letter, setLetter] = useState<Letter | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!letterId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    // Real-time Firestore listener (onSnapshot)
    const unsubscribe = letterRepository.subscribeById(letterId, (data) => {
      setLetter(data)
      setLoading(false)
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [letterId])

  const handleAction = async (
    userId: string,
    action: 'approve' | 'reject',
    notes?: string
  ): Promise<boolean> => {
    if (!letterId) return false
    setActionLoading(true)
    setError(null)
    try {
      const updated = await letterService.processApproval(letterId, userId, action, notes)
      setLetter(updated)
      setFeedbackMsg(
        action === 'approve'
          ? updated.status === 'Processing PDF'
            ? 'Persetujuan tersimpan! Server sedang merender PDF dokumen via Google Workspace APIs.'
            : 'Keputusan berhasil disimpan: Dokumen telah disetujui.'
          : 'Keputusan berhasil disimpan: Dokumen telah ditolak dengan catatan evaluasi.'
      )
      return true
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Aksi otorisasi gagal diproses'
      setError(msg)
      return false
    } finally {
      setActionLoading(false)
    }
  }

  const handleRetryPdf = async (): Promise<boolean> => {
    if (!letterId) return false
    setActionLoading(true)
    setError(null)
    try {
      const updated = await letterService.retryPdfProcessing(letterId)
      setLetter(updated)
      setFeedbackMsg('Pemicu proses ulang PDF berhasil dikirim ke server!')
      return true
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memicu proses ulang PDF'
      setError(msg)
      return false
    } finally {
      setActionLoading(false)
    }
  }

  const clearFeedback = () => setFeedbackMsg(null)

  const refresh = async () => {
    if (!letterId) return
    const data = await letterRepository.findById(letterId)
    setLetter(data)
  }

  return {
    letter,
    loading,
    actionLoading,
    error,
    feedbackMsg,
    setFeedbackMsg,
    clearFeedback,
    refresh,
    handleAction,
    handleRetryPdf,
  }
}
