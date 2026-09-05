import { useState, useEffect, useCallback } from 'react'
import type { Letter, LetterStatus, ApproverOption } from './letter.model'
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
  const [templateType, setTemplateType] = useState<string>('Surat Tugas')
  const [department, setDepartment] = useState<string>('HR')
  const [reviewerId, setReviewerId] = useState<string>('')
  const [approverId, setApproverId] = useState<string>('')

  const [formData, setFormData] = useState<Record<string, string>>({
    recipientName: '',
    recipientNik: '',
    position: '',
    destination: '',
    purpose: '',
    startDate: '',
    endDate: '',
    violationDate: '',
    violationReason: '',
    effectiveDate: '',
  })

  const [candidates, setCandidates] = useState<{ reviewers: ApproverOption[]; approvers: ApproverOption[] }>({
    reviewers: [],
    approvers: [],
  })
  const [loadingCandidates, setLoadingCandidates] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  // Load available reviewers and approvers
  useEffect(() => {
    let isMounted = true
    const loadCandidates = async () => {
      setLoadingCandidates(true)
      try {
        const options = await letterService.getApprovalOptions()
        if (isMounted) {
          setCandidates(options)
          if (options.reviewers.length > 0 && !reviewerId) {
            setReviewerId(options.reviewers[0].uid)
          }
          if (options.approvers.length > 0 && !approverId) {
            setApproverId(options.approvers[0].uid)
          }
        }
      } catch (err) {
        console.warn('Gagal memuat kandidat approval:', err)
      } finally {
        if (isMounted) setLoadingCandidates(false)
      }
    }

    loadCandidates()
    return () => {
      isMounted = false
    }
  }, [])

  const handleFieldChange = useCallback((field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }, [])

  const handleTemplateChange = useCallback((newTemplate: string) => {
    setTemplateType(newTemplate)
    setError(null)
  }, [])

  const submitLetterDraft = async (
    drafterId: string,
    drafterName: string
  ): Promise<Letter | null> => {
    setLoading(true)
    setError(null)
    setFeedback(null)

    try {
      const created = await letterService.createLetterDraft(
        {
          templateType,
          department,
          contentData: formData,
          reviewerId: reviewerId || undefined,
          approverId,
        },
        drafterId,
        drafterName,
        candidates
      )

      setFeedback(`Draf surat "${created.letterNumber}" berhasil disimpan! Mengalihkan ke dashboard...`)
      return created
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan draf surat'
      setError(msg)
      return null
    } finally {
      setLoading(false)
    }
  }

  const resetForm = useCallback(() => {
    setFormData({
      recipientName: '',
      recipientNik: '',
      position: '',
      destination: '',
      purpose: '',
      startDate: '',
      endDate: '',
      violationDate: '',
      violationReason: '',
      effectiveDate: '',
    })
    setError(null)
    setFeedback(null)
  }, [])

  return {
    templateType,
    department,
    reviewerId,
    approverId,
    formData,
    candidates,
    loadingCandidates,
    loading,
    error,
    feedback,
    setDepartment,
    setReviewerId,
    setApproverId,
    handleFieldChange,
    handleTemplateChange,
    submitLetterDraft,
    resetForm,
    clearError: () => setError(null),
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
