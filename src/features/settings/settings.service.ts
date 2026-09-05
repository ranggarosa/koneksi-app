import type { ISettingsRepository } from './settings.repository'
import { settingsRepository } from './settings.repository'
import type { ManagedUser, UserProfileSettings } from './settings.model'
import type { UserRole } from '@/features/auth/auth.model'

export class SettingsService {
  constructor(private readonly repo: ISettingsRepository) {}

  async listUsers(): Promise<ManagedUser[]> {
    return this.repo.getManagedUsers()
  }

  async changeUserRole(uid: string, newRole: UserRole): Promise<ManagedUser> {
    if (!uid || !newRole) {
      throw new Error('ID pengguna dan peran baru wajib diisi')
    }
    return this.repo.updateUserRole(uid, newRole)
  }

  async saveSignature(uid: string, signatureUrl: string): Promise<UserProfileSettings> {
    if (!signatureUrl) {
      throw new Error('URL atau file tanda tangan digital tidak valid')
    }
    return this.repo.updateSignature(uid, signatureUrl)
  }
}

export const settingsService = new SettingsService(settingsRepository)
