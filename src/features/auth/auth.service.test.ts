import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthService } from './auth.service'
import type { IAuthRepository } from './auth.repository'
import type { User } from './auth.model'

describe('AuthService', () => {
  let mockAuthRepo: IAuthRepository
  let authService: AuthService

  const mockUser: User = {
    uid: 'user_123',
    name: 'Test User',
    email: 'test@example.com',
    role: 'drafter',
    createdAt: '2026-09-05T00:00:00Z',
  }

  beforeEach(() => {
    mockAuthRepo = {
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      getCurrentUser: vi.fn(),
      saveUserToFirestore: vi.fn(),
      subscribeToAuthState: vi.fn(),
    }
    authService = new AuthService(mockAuthRepo)
  })

  describe('getCurrentUser & subscribeToAuthState', () => {
    it('delegates getCurrentUser to repository', async () => {
      vi.spyOn(mockAuthRepo, 'getCurrentUser').mockResolvedValue(mockUser)
      const user = await authService.getCurrentUser()
      expect(user).toEqual(mockUser)
      expect(mockAuthRepo.getCurrentUser).toHaveBeenCalledOnce()
    })

    it('delegates subscribeToAuthState to repository', () => {
      const callback = vi.fn()
      const unsubscribe = vi.fn()
      vi.spyOn(mockAuthRepo, 'subscribeToAuthState').mockReturnValue(unsubscribe)

      const result = authService.subscribeToAuthState(callback)
      expect(mockAuthRepo.subscribeToAuthState).toHaveBeenCalledWith(callback)
      expect(result).toBe(unsubscribe)
    })
  })

  describe('loginWithGoogle', () => {
    it('successfully logs in and keeps existing role', async () => {
      vi.spyOn(mockAuthRepo, 'signInWithGoogle').mockResolvedValue({
        ...mockUser,
        role: 'approver',
      })

      const user = await authService.loginWithGoogle()

      expect(user.role).toBe('approver')
      expect(mockAuthRepo.saveUserToFirestore).not.toHaveBeenCalled()
    })

    it('defaults role to "drafter" and saves to firestore if user has no role', async () => {
      const userWithoutRole: any = {
        uid: 'user_new',
        name: 'New User',
        email: 'new@example.com',
        role: undefined,
      }
      vi.spyOn(mockAuthRepo, 'signInWithGoogle').mockResolvedValue(userWithoutRole)

      const user = await authService.loginWithGoogle()

      expect(user.role).toBe('drafter')
      expect(mockAuthRepo.saveUserToFirestore).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'user_new',
          role: 'drafter',
        })
      )
    })

    it('throws error when user object is null or missing uid', async () => {
      vi.spyOn(mockAuthRepo, 'signInWithGoogle').mockResolvedValue(null as any)

      await expect(authService.loginWithGoogle()).rejects.toThrow(
        'Informasi pengguna tidak valid dari penyedia autentikasi.'
      )
    })

    it('formats auth errors properly (popup closed, blocked, unauthorized, network)', async () => {
      vi.spyOn(mockAuthRepo, 'signInWithGoogle').mockRejectedValue({
        code: 'auth/popup-closed-by-user',
      })

      await expect(authService.loginWithGoogle()).rejects.toThrow(
        'Jendela login ditutup sebelum otentikasi selesai.'
      )

      vi.spyOn(mockAuthRepo, 'signInWithGoogle').mockRejectedValue({
        code: 'auth/popup-blocked',
      })

      await expect(authService.loginWithGoogle()).rejects.toThrow(
        'Pop-up login diblokir oleh browser. Harap izinkan pop-up untuk situs ini.'
      )

      vi.spyOn(mockAuthRepo, 'signInWithGoogle').mockRejectedValue({
        code: 'auth/network-request-failed',
      })

      await expect(authService.loginWithGoogle()).rejects.toThrow(
        'Koneksi jaringan terputus. Silakan periksa jaringan internet Anda.'
      )

      vi.spyOn(mockAuthRepo, 'signInWithGoogle').mockRejectedValue({
        code: 'auth/unauthorized-domain',
      })

      await expect(authService.loginWithGoogle()).rejects.toThrow(
        'Domain aplikasi belum terdaftar pada daftar Authorized Domains di Firebase Console.'
      )
    })
  })

  describe('logout', () => {
    it('successfully calls repo.signOut', async () => {
      vi.spyOn(mockAuthRepo, 'signOut').mockResolvedValue(undefined)
      await expect(authService.logout()).resolves.toBeUndefined()
      expect(mockAuthRepo.signOut).toHaveBeenCalledOnce()
    })

    it('throws formatted error if signOut fails', async () => {
      vi.spyOn(mockAuthRepo, 'signOut').mockRejectedValue(new Error('Network error'))
      await expect(authService.logout()).rejects.toThrow('Network error')
    })
  })

  describe('role permission checks', () => {
    it('canCreateLetter returns true only for drafter and admin', () => {
      expect(authService.canCreateLetter({ ...mockUser, role: 'drafter' })).toBe(true)
      expect(authService.canCreateLetter({ ...mockUser, role: 'admin' })).toBe(true)
      expect(authService.canCreateLetter({ ...mockUser, role: 'reviewer' })).toBe(false)
      expect(authService.canCreateLetter({ ...mockUser, role: 'approver' })).toBe(false)
      expect(authService.canCreateLetter(null)).toBe(false)
    })

    it('canApproveLetter returns true for reviewer, approver, and admin', () => {
      expect(authService.canApproveLetter({ ...mockUser, role: 'reviewer' })).toBe(true)
      expect(authService.canApproveLetter({ ...mockUser, role: 'approver' })).toBe(true)
      expect(authService.canApproveLetter({ ...mockUser, role: 'admin' })).toBe(true)
      expect(authService.canApproveLetter({ ...mockUser, role: 'drafter' })).toBe(false)
      expect(authService.canApproveLetter(null)).toBe(false)
    })
  })
})
