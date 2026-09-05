import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthController } from '@/features/auth/auth.controller'
import type { UserRole } from '@/features/auth/auth.model'

interface RoleRouteProps {
  allowedRoles: UserRole[]
  redirectTo?: string
}

export const RoleRoute: React.FC<RoleRouteProps> = ({
  allowedRoles,
  redirectTo = '/dashboard',
}) => {
  const { user, loading } = useAuthController()

  if (loading) {
    return null // Handled by outer ProtectedRoute
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Admin has overarching access, otherwise check if role is in allowedRoles
  const hasAccess = user.role === 'admin' || allowedRoles.includes(user.role)

  if (!hasAccess) {
    return <Navigate to={redirectTo} replace />
  }

  return <Outlet />
}
