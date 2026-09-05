import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { User, UserRole } from './auth.model'
import { authService } from './auth.service'

interface AuthContextValue {
  user: User | null
  loading: boolean
  error: string | null
  handleGoogleLogin: (preferredRole?: UserRole) => Promise<User | null>
  handleLogout: () => Promise<void>
  clearError: () => void
  canCreateLetter: boolean
  canApproveLetter: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Listen to Firebase Auth state changes
    const unsubscribe = authService.subscribeToAuthState((currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const handleGoogleLogin = useCallback(async (preferredRole?: UserRole): Promise<User | null> => {
    setLoading(true)
    setError(null)
    try {
      const loggedInUser = await authService.loginWithGoogle(preferredRole)
      setUser(loggedInUser)
      return loggedInUser
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login gagal'
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const handleLogout = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      await authService.logout()
      setUser(null)
      setError(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Logout gagal'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const value: AuthContextValue = {
    user,
    loading,
    error,
    handleGoogleLogin,
    handleLogout,
    clearError,
    canCreateLetter: authService.canCreateLetter(user),
    canApproveLetter: authService.canApproveLetter(user),
  }

  return React.createElement(AuthContext.Provider, { value }, children)
}

export function useAuthController(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthController harus digunakan di dalam AuthProvider')
  }
  return context
}

// Alias for convenience
export const useAuth = useAuthController
