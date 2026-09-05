import type { User, UserRole } from './auth.model'

export interface IAuthRepository {
  getCurrentUser(): Promise<User | null>
  signInWithGoogle(preferredRole?: UserRole): Promise<User>
  signOut(): Promise<void>
}

// Mock implementation ready for Firebase Auth integration
class AuthRepository implements IAuthRepository {
  private currentUser: User | null = {
    uid: 'usr_001',
    email: 'drafter@koneksi.co.id',
    name: 'Ahmad Drafter',
    role: 'drafter',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmad',
  }

  async getCurrentUser(): Promise<User | null> {
    return this.currentUser
  }

  async signInWithGoogle(preferredRole: UserRole = 'drafter'): Promise<User> {
    // Simulated auth delay
    await new Promise((resolve) => setTimeout(resolve, 300))

    const mockUser: User = {
      uid: `usr_${Date.now()}`,
      email: `${preferredRole}@koneksi.co.id`,
      name: preferredRole.charAt(0).toUpperCase() + preferredRole.slice(1) + ' User',
      role: preferredRole,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${preferredRole}`,
      signatureUrl: preferredRole === 'approver' ? 'https://dummyimage.com/200x80/000/fff&text=Signature' : undefined,
    }

    this.currentUser = mockUser
    return mockUser
  }

  async signOut(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 200))
    this.currentUser = null
  }
}

export const authRepository = new AuthRepository()
