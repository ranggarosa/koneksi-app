import type { ISettingsRepository } from './settings.repository'
import { settingsRepository } from './settings.repository'
import type { IStorageRepository } from './storage.repository'
import { storageRepository } from './storage.repository'
import type { ManagedUser, UserProfileSettings } from './settings.model'
import type { UserRole } from '@/features/auth/auth.model'

export class SettingsService {
  constructor(
    private readonly repo: ISettingsRepository,
    private readonly storageRepo: IStorageRepository = storageRepository
  ) {}

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

  async uploadAndSaveSignature(uid: string, file: File): Promise<UserProfileSettings> {
    if (!uid || !file) {
      throw new Error('ID pengguna dan berkas tanda tangan wajib disertakan')
    }
    const downloadUrl = await this.storageRepo.uploadSignature(file, uid)
    return this.repo.updateSignature(uid, downloadUrl)
  }
}

export const settingsService = new SettingsService(settingsRepository, storageRepository)
