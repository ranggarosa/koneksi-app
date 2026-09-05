import type { ManagedUser, UserProfileSettings } from './settings.model'
import type { UserRole } from '@/features/auth/auth.model'

export interface ISettingsRepository {
  getManagedUsers(): Promise<ManagedUser[]>
  updateUserRole(uid: string, newRole: UserRole): Promise<ManagedUser>
  updateSignature(uid: string, signatureUrl: string): Promise<UserProfileSettings>
}

class SettingsRepository implements ISettingsRepository {
  private users: ManagedUser[] = [
    {
      uid: 'usr_001',
      name: 'Ahmad Drafter',
      email: 'ahmad@koneksi.co.id',
      role: 'drafter',
      department: 'HR Operations',
      updatedAt: '2026-09-01T08:00:00Z',
    },
    {
      uid: 'usr_002',
      name: 'Siti Reviewer',
      email: 'siti@koneksi.co.id',
      role: 'reviewer',
      department: 'HR Quality & Compliance',
      updatedAt: '2026-09-01T08:00:00Z',
    },
    {
      uid: 'usr_003',
      name: 'Hendra Approver',
      email: 'hendra@koneksi.co.id',
      role: 'approver',
      department: 'Head of Human Resources',
      updatedAt: '2026-09-01T08:00:00Z',
    },
    {
      uid: 'usr_004',
      name: 'Admin Utama',
      email: 'admin@koneksi.co.id',
      role: 'admin',
      department: 'IT Systems',
      updatedAt: '2026-09-01T08:00:00Z',
    },
  ]

  async getManagedUsers(): Promise<ManagedUser[]> {
    await new Promise((resolve) => setTimeout(resolve, 200))
    return [...this.users]
  }

  async updateUserRole(uid: string, newRole: UserRole): Promise<ManagedUser> {
    await new Promise((resolve) => setTimeout(resolve, 200))
    const user = this.users.find((u) => u.uid === uid)
    if (!user) {
      throw new Error('Pengguna tidak ditemukan')
    }
    user.role = newRole
    user.updatedAt = new Date().toISOString()
    return { ...user }
  }

  async updateSignature(uid: string, signatureUrl: string): Promise<UserProfileSettings> {
    await new Promise((resolve) => setTimeout(resolve, 250))
    return {
      uid,
      name: 'Hendra Approver',
      email: 'hendra@koneksi.co.id',
      role: 'approver',
      signatureUrl,
    }
  }
}

export const settingsRepository = new SettingsRepository()
