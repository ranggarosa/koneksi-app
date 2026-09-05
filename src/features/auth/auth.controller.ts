import { useState, useEffect, useCallback } from 'react'
import type { User, UserRole, AuthState } from './auth.model'
import { authService } from './auth.service'

export function useAuthController() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  })

  const loadUser = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const user = await authService.getCurrentUser()
      setState({ user, loading: false, error: null })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal memuat pengguna'
      setState({ user: null, loading: false, error: message })
    }
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const handleGoogleLogin = async (preferredRole: UserRole = 'drafter'): Promise<User | null> => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const user = await authService.loginWithGoogle(preferredRole)
      setState({ user, loading: false, error: null })
      return user
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login gagal'
      setState((prev) => ({ ...prev, loading: false, error: message }))
      return null
    }
  }

  const handleLogout = async (): Promise<void> => {
    setState((prev) => ({ ...prev, loading: true }))
    try {
      await authService.logout()
      setState({ user: null, loading: false, error: null })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Logout gagal'
      setState((prev) => ({ ...prev, loading: false, error: message }))
    }
  }

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    handleGoogleLogin,
    handleLogout,
    canCreateLetter: authService.canCreateLetter(state.user),
    canApproveLetter: authService.canApproveLetter(state.user),
  }
}
