import type { IAuthRepository } from './auth.repository'
import { authRepository } from './auth.repository'
import type { User, UserRole } from './auth.model'

export class AuthService {
  constructor(private readonly repo: IAuthRepository) {}

  async getCurrentUser(): Promise<User | null> {
    return this.repo.getCurrentUser()
  }

  async loginWithGoogle(preferredRole: UserRole = 'drafter'): Promise<User> {
    const user = await this.repo.signInWithGoogle(preferredRole)
    if (!user || !user.email) {
      throw new Error('Autentikasi gagal: Informasi pengguna tidak valid')
    }
    return user
  }

  async logout(): Promise<void> {
    await this.repo.signOut()
  }

  canCreateLetter(user: User | null): boolean {
    return user?.role === 'drafter' || user?.role === 'admin'
  }

  canApproveLetter(user: User | null): boolean {
    return user?.role === 'approver' || user?.role === 'reviewer' || user?.role === 'admin'
  }
}

export const authService = new AuthService(authRepository)
