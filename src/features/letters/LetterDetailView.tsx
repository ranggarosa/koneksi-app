import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, X, FileText, CheckCircle2, Clock, AlertOctagon } from 'lucide-react'
import { useLetterDetailController } from './letter.controller'
import { useAuthController } from '@/features/auth/auth.controller'
import { Badge } from '@/components/common/Badge'

export const LetterDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthController()
  const { letter, loading, actionLoading, error, handleAction } = useLetterDetailController(id)
  const [notes, setNotes] = useState('')
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null)

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Memuat pratinjau surat...</div>
  }

  if (!letter) {
    return (
      <div className="p-12 text-center">
        <p className="text-slate-800 font-bold">Surat tidak ditemukan</p>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg"
        >
          Kembali ke Dashboard
        </button>
      </div>
    )
  }

  // Check if current user is an assigned reviewer/approver with pending status
  const pendingStep = letter.approvalFlow.find(
    (step) => step.status === 'pending'
  )
  const isMyTurn = user && pendingStep && (user.role === 'admin' || user.role === pendingStep.role)

  const onApprove = async () => {
    if (!user) return
    const targetUserId = pendingStep ? pendingStep.userId : user.uid
    const ok = await handleAction(targetUserId, 'approve', notes)
    if (ok) {
      setFeedbackMsg('Dokumen berhasil disetujui.')
      setNotes('')
    }
  }

  const onReject = async () => {
    if (!user) return
    const targetUserId = pendingStep ? pendingStep.userId : user.uid
    const ok = await handleAction(targetUserId, 'reject', notes)
    if (ok) {
      setFeedbackMsg('Dokumen ditolak dengan catatan.')
      setNotes('')
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Riwayat Surat</span>
        </button>
        <Badge status={letter.status} />
      </div>

      {feedbackMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center justify-between">
          <span>{feedbackMsg}</span>
          <button type="button" onClick={() => setFeedbackMsg(null)} className="text-emerald-800 font-bold">
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Document Preview (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
          <div className="border-b border-slate-200 pb-4 text-center">
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
              {letter.templateType}
            </h2>
            <p className="text-sm font-semibold text-indigo-600 mt-0.5">
              Nomor: {letter.letterNumber}
            </p>
            {letter.contentData.jenisSurat && (
              <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {String(letter.contentData.jenisSurat)}
              </span>
            )}
          </div>

          <div className="space-y-4 text-sm text-slate-700 leading-relaxed min-h-[280px] bg-slate-50/70 p-6 rounded-xl border border-slate-200">
            <p className="font-semibold text-slate-800">Yang bertanda tangan di bawah ini menerangkan bahwa:</p>
            <div className="grid grid-cols-3 gap-2 pl-2">
              <span className="text-slate-500">Nama</span>
              <span className="col-span-2 font-medium text-slate-900">: {String(letter.contentData.recipientName || '-')}</span>

              <span className="text-slate-500">NIK</span>
              <span className="col-span-2 font-medium text-slate-900">: {String(letter.contentData.recipientNik || '-')}</span>

              {letter.contentData.destination && (
                <>
                  <span className="text-slate-500">Tujuan Penugasan</span>
                  <span className="col-span-2 font-medium text-slate-900">: {String(letter.contentData.destination)}</span>
                </>
              )}

              {letter.contentData.purpose && (
                <>
                  <span className="text-slate-500">Agenda / Keperluan</span>
                  <span className="col-span-2 font-medium text-slate-900">: {String(letter.contentData.purpose)}</span>
                </>
              )}

              {letter.contentData.violation && (
                <>
                  <span className="text-slate-500">Uraian Pelanggaran</span>
                  <span className="col-span-2 font-medium text-slate-900">: {String(letter.contentData.violation)}</span>
                </>
              )}

              {letter.contentData.position && (
                <>
                  <span className="text-slate-500">Jabatan</span>
                  <span className="col-span-2 font-medium text-slate-900">: {String(letter.contentData.position)}</span>
                </>
              )}
            </div>

            <p className="pt-4">
              Demikian surat resmi ini diterbitkan untuk dipergunakan sebagaimana mestinya dengan penuh tanggung jawab.
            </p>

            <div className="pt-8 flex justify-between items-end text-xs text-slate-500">
              <div>
                <p>Dibuat oleh: <span className="font-semibold text-slate-800">{letter.drafterName}</span></p>
                <p>Tanggal: {new Date(letter.createdAt).toLocaleDateString('id-ID')}</p>
              </div>

              {letter.status === 'Approved' && (
                <div className="text-right">
                  <div className="inline-block border border-emerald-500 text-emerald-600 font-bold px-3 py-1 rounded tracking-wider uppercase text-[10px]">
                    Verified E-Signature
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">Otorisasi Selesai</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Info & Action Panel (1 Col) */}
        <div className="space-y-6">
          {/* Approval Timeline Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
              Jejak Alur Persetujuan
            </h3>

            <div className="space-y-4">
              {/* Drafter */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900">{letter.drafterName}</p>
                  <p className="text-[11px] text-slate-500">Drafter • Dokumen Dibuat</p>
                </div>
              </div>

              {/* Reviewer / Approver steps */}
              {letter.approvalFlow.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      step.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-600'
                        : step.status === 'rejected'
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    {step.status === 'approved' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : step.status === 'rejected' ? (
                      <AlertOctagon className="w-4 h-4" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900">{step.userName}</p>
                    <p className="text-[11px] text-slate-500 capitalize">
                      {step.role} • <span className="font-semibold">{step.status}</span>
                    </p>
                    {step.notes && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 mt-1 italic">
                        "{step.notes}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Panel (For Reviewers / Approvers) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Panel Keputusan Otorisasi
            </h3>

            {letter.status === 'Approved' ? (
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs font-medium text-center">
                Dokumen telah selesai diotorisasi secara sah.
              </div>
            ) : letter.status === 'Rejected' ? (
              <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-xs font-medium text-center">
                Dokumen ini telah ditolak.
              </div>
            ) : isMyTurn ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  Giliran Anda untuk meninjau/menyetujui dokumen ini sebagai <span className="font-bold text-indigo-600 capitalize">{pendingStep?.role}</span>.
                </p>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Catatan Revisi / Review</label>
                  <textarea
                    rows={2}
                    placeholder="Tuliskan catatan jika ada hal yang perlu direvisi..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={onReject}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 transition disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={onApprove}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs text-center">
                Menunggu giliran peninjauan oleh <span className="font-semibold text-slate-700">{pendingStep?.userName}</span> ({pendingStep?.role}).
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
