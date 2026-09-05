import { useState, useEffect, useCallback } from 'react'
import type { Letter } from './letter.model'
import { letterService } from './letter.service'

export function useLetterDetailController(letterId?: string) {
  const [letter, setLetter] = useState<Letter | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null)

  const fetchDetail = useCallback(async () => {
    if (!letterId) return
    setLoading(true)
    setError(null)
    try {
      const data = await letterService.getLetterById(letterId)
      setLetter(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat detail surat'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [letterId])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

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
          ? 'Keputusan berhasil disimpan: Dokumen telah disetujui.'
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

  const clearFeedback = () => setFeedbackMsg(null)

  return {
    letter,
    loading,
    actionLoading,
    error,
    feedbackMsg,
    setFeedbackMsg,
    clearFeedback,
    refresh: fetchDetail,
    handleAction,
  }
}
