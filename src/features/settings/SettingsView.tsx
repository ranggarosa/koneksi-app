import React, { useState } from 'react'
import { User, Shield, PenTool, CheckCircle2, AlertCircle } from 'lucide-react'
import { useSettingsController } from './settings.controller'
import { useAuthController } from '@/features/auth/auth.controller'
import type { UserRole } from '@/features/auth/auth.model'

export const SettingsView: React.FC = () => {
  const { user } = useAuthController()
  const { users, loading, saving, error, successMessage, clearSuccess, updateUserRole, uploadSignature } =
    useSettingsController()
  const [activeTab, setActiveTab] = useState<'profile' | 'users'>('profile')
  const [signaturePreview, setSignaturePreview] = useState<string | null>(user?.signatureUrl || null)

  const handleSimulateUpload = () => {
    if (!user) return
    const mockSig = 'https://dummyimage.com/300x120/4f46e5/ffffff&text=E-Signature+Hendra'
    setSignaturePreview(mockSig)
    uploadSignature(user.uid, mockSig)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pengaturan Sistem</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Kelola profil pengguna, spesimen tanda tangan elektronik, dan manajemen peran.
        </p>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button type="button" onClick={clearSuccess} className="text-emerald-800 font-bold">
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'profile'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profil Pribadi & Tanda Tangan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'users'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Manajemen Akses & Role Pengguna</span>
        </button>
      </div>

      {/* Tab 1: Profile & Signature */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Informasi Akun Pengguna
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase">Nama Lengkap</label>
                <p className="font-semibold text-slate-800 mt-0.5">{user?.name || 'Ahmad Drafter'}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase">Email Perusahaan</label>
                <p className="text-slate-600 mt-0.5">{user?.email || 'ahmad@koneksi.co.id'}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase">Peran Saat Ini</label>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 capitalize border border-indigo-200">
                  {user?.role || 'drafter'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                Spesimen Tanda Tangan Digital (E-Signature)
              </h2>
              <PenTool className="w-4 h-4 text-indigo-600" />
            </div>

            <p className="text-xs text-slate-500">
              Khusus Approver: gambar tanda tangan akan diinjeksi secara otomatis pada lembar PDF final surat yang disetujui.
            </p>

            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50/60">
              {signaturePreview ? (
                <div className="space-y-3">
                  <img
                    src={signaturePreview}
                    alt="Spesimen Tanda Tangan"
                    className="max-h-24 mx-auto rounded border border-slate-200 bg-white p-2 shadow-xs"
                  />
                  <p className="text-xs text-emerald-600 font-medium flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Spesimen Tanda Tangan Terdaftar
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400">Belum ada spesimen tanda tangan diunggah</p>
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={handleSimulateUpload}
              className="w-full py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl border border-indigo-200 transition"
            >
              {saving ? 'Memproses...' : 'Simulasi Unggah / Perbarui Spesimen Tanda Tangan'}
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: User Role Management */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50">
            <h2 className="text-base font-bold text-slate-900">Daftar Pengguna & Hak Akses</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Atur hak peran pengguna sistem (Drafter, Reviewer, Approver, Admin)
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Memuat daftar pengguna...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-5">Nama Pengguna</th>
                    <th className="py-3 px-5">Email</th>
                    <th className="py-3 px-5">Departemen</th>
                    <th className="py-3 px-5">Role Akses</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((item) => (
                    <tr key={item.uid} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-slate-900">{item.name}</td>
                      <td className="py-3.5 px-5 text-slate-500 text-xs">{item.email}</td>
                      <td className="py-3.5 px-5 text-slate-600">{item.department}</td>
                      <td className="py-3.5 px-5">
                        <select
                          value={item.role}
                          disabled={saving}
                          onChange={(e) => updateUserRole(item.uid, e.target.value as UserRole)}
                          className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 capitalize"
                        >
                          <option value="drafter">Drafter</option>
                          <option value="reviewer">Reviewer</option>
                          <option value="approver">Approver</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
