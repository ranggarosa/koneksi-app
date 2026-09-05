import { useState, useEffect, useCallback } from 'react'
import type { Letter, CreateLetterDTO, LetterStatus } from './letter.model'
import { letterService } from './letter.service'

export function useLetterDashboardController() {
  const [letters, setLetters] = useState<Letter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<LetterStatus | 'All'>('All')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchLetters = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await letterService.getAllLetters()
      setLetters(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat data surat'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLetters()
  }, [fetchLetters])

  const filteredLetters = letters.filter((letter) => {
    const matchesStatus = statusFilter === 'All' || letter.status === statusFilter
    const matchesSearch =
      letter.letterNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      letter.templateType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      letter.drafterName.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const metrics = letterService.calculateMetrics(letters)

  return {
    letters: filteredLetters,
    rawLetters: letters,
    metrics,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    refresh: fetchLetters,
  }
}

export function useCreateLetterController() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const submitDraft = async (
    dto: CreateLetterDTO,
    drafterId: string,
    drafterName: string
  ): Promise<Letter | null> => {
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const created = await letterService.createLetterDraft(dto, drafterId, drafterName)
      setSuccess(true)
      return created
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membuat draf surat'
      setError(msg)
      return null
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    success,
    submitDraft,
  }
}

export function useLetterDetailController(letterId?: string) {
  const [letter, setLetter] = useState<Letter | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      return true
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Aksi gagal diproses'
      setError(msg)
      return false
    } finally {
      setActionLoading(false)
    }
  }

  return {
    letter,
    loading,
    actionLoading,
    error,
    refresh: fetchDetail,
    handleAction,
  }
}
