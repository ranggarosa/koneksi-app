import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FilePlus, ArrowLeft, Send, AlertCircle, CheckCircle } from 'lucide-react'
import { useCreateLetterController } from './letter.controller'
import { useAuthController } from '@/features/auth/auth.controller'

export const CreateLetterView: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthController()
  const { submitDraft, loading, error, success } = useCreateLetterController()

  const [templateType, setTemplateType] = useState('Surat Tugas')
  const [department, setDepartment] = useState('HR')
  const [reviewerId, setReviewerId] = useState('usr_002')
  const [approverId, setApproverId] = useState('usr_003')

  // Dynamic form state
  const [contentData, setContentData] = useState<Record<string, string>>({
    recipientName: '',
    recipientNik: '',
    destination: '',
    purpose: '',
    startDate: '',
    endDate: '',
    violation: '',
    effectiveDate: '',
    position: '',
  })

  const handleInputChange = (field: string, value: string) => {
    setContentData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const created = await submitDraft(
      {
        templateType,
        department,
        contentData,
        reviewerId,
        approverId,
      },
      user.uid,
      user.name
    )

    if (created) {
      setTimeout(() => {
        navigate('/dashboard')
      }, 1000)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button & Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Dashboard</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <FilePlus className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Buat Draf Surat Baru</h1>
            <p className="text-xs text-slate-500">Pilih template dan lengkapi variabel form di bawah ini</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>Draf surat berhasil dibuat! Mengalihkan ke dashboard...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template & Department Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Kategori / Template Surat <span className="text-rose-500">*</span>
              </label>
              <select
                value={templateType}
                onChange={(e) => setTemplateType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              >
                <option value="Surat Tugas">Surat Tugas (ST)</option>
                <option value="Surat Peringatan 1">Surat Peringatan 1 (SP1)</option>
                <option value="Surat Keterangan Kerja">Surat Keterangan Kerja (SKK)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Departemen Penerbit <span className="text-rose-500">*</span>
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              >
                <option value="HR">Human Resources (HR)</option>
                <option value="OPS">Operations (OPS)</option>
                <option value="FIN">Finance (FIN)</option>
              </select>
            </div>
          </div>

          <div className="h-px bg-slate-200" />

          {/* Dynamic Form Section */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Variabel Konten Surat ({templateType})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Nama Penerima / Karyawan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Dimas Aditya"
                  value={contentData.recipientName}
                  onChange={(e) => handleInputChange('recipientName', e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  NIK / Nomor Identitas Karyawan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 1993081001"
                  value={contentData.recipientNik}
                  onChange={(e) => handleInputChange('recipientNik', e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>
            </div>

            {/* Template Specific Inputs */}
            {templateType === 'Surat Tugas' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Lokasi / Kota Tujuan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Surabaya"
                    value={contentData.destination}
                    onChange={(e) => handleInputChange('destination', e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Tujuan Penugasan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Pelatihan Implementasi Sistem"
                    value={contentData.purpose}
                    onChange={(e) => handleInputChange('purpose', e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>
            )}

            {templateType === 'Surat Peringatan 1' && (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Uraian Pelanggaran</label>
                  <textarea
                    rows={3}
                    placeholder="Contoh: Tidak hadir tanpa keterangan selama 3 hari berturut-turut..."
                    value={contentData.violation}
                    onChange={(e) => handleInputChange('violation', e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>
            )}

            {templateType === 'Surat Keterangan Kerja' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Jabatan Terakhir</label>
                  <input
                    type="text"
                    placeholder="Contoh: Software Engineer"
                    value={contentData.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="h-px bg-slate-200" />

          {/* Workflow Matrix */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Pengaturan Alur Persetujuan (Workflow)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  1. Petugas Reviewer <span className="text-rose-500">*</span>
                </label>
                <select
                  value={reviewerId}
                  onChange={(e) => setReviewerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  <option value="usr_002">Siti Reviewer (HR Officer)</option>
                  <option value="usr_005">Dewi Reviewer (Legal Compliance)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  2. Petugas Approver Final <span className="text-rose-500">*</span>
                </label>
                <select
                  value={approverId}
                  onChange={(e) => setApproverId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  <option value="usr_003">Hendra Approver (Head of HR)</option>
                  <option value="usr_006">Bambang Approver (VP People Ops)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Menyimpan...' : 'Submit Draft'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
