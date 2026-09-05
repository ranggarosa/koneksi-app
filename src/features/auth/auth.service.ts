import type { IAuthRepository } from './auth.repository'
import { authRepository } from './auth.repository'
import type { User, UserRole } from './auth.model'

export class AuthService {
  constructor(private readonly repo: IAuthRepository) {}

  async getCurrentUser(): Promise<User | null> {
    return this.repo.getCurrentUser()
  }

  subscribeToAuthState(callback: (user: User | null) => void): () => void {
    return this.repo.subscribeToAuthState(callback)
  }

  formatAuthError(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = (error as { code: string }).code
      switch (code) {
        case 'auth/popup-closed-by-user':
          return 'Jendela login ditutup sebelum otentikasi selesai.'
        case 'auth/cancelled-popup-request':
          return 'Proses login sebelumnya dibatalkan.'
        case 'auth/popup-blocked':
          return 'Pop-up login diblokir oleh browser. Harap izinkan pop-up untuk situs ini.'
        case 'auth/unauthorized-domain':
          return 'Domain aplikasi belum terdaftar pada daftar Authorized Domains di Firebase Console.'
        case 'auth/network-request-failed':
          return 'Koneksi jaringan terputus. Silakan periksa jaringan internet Anda.'
        default:
          return `Autentikasi gagal (${code}). Silakan coba beberapa saat lagi.`
      }
    }
    return error instanceof Error ? error.message : 'Terjadi kesalahan saat masuk dengan Google.'
  }

  async loginWithGoogle(preferredRole?: UserRole): Promise<User> {
    try {
      const user = await this.repo.signInWithGoogle(preferredRole)

      if (!user || !user.uid) {
        throw new Error('Informasi pengguna tidak valid dari penyedia autentikasi.')
      }

      // Ensure default role is 'drafter' if none assigned
      if (!user.role) {
        user.role = 'drafter'
        await this.repo.saveUserToFirestore(user)
      }

      return user
    } catch (err) {
      const formattedMessage = this.formatAuthError(err)
      throw new Error(formattedMessage)
    }
  }

  async logout(): Promise<void> {
    try {
      await this.repo.signOut()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal keluar dari sesi'
      throw new Error(msg)
    }
  }

  canCreateLetter(user: User | null): boolean {
    return user?.role === 'drafter' || user?.role === 'admin'
  }

  canApproveLetter(user: User | null): boolean {
    return user?.role === 'approver' || user?.role === 'reviewer' || user?.role === 'admin'
  }
}

export const authService = new AuthService(authRepository)
