import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { LoginView } from '@/features/auth/LoginView'
import { LetterDashboardView } from '@/features/letters/LetterDashboardView'
import { CreateLetterView } from '@/features/letters/CreateLetterView'
import { LetterDetailView } from '@/features/letters/LetterDetailView'
import { SettingsView } from '@/features/settings/SettingsView'

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Auth Route */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginView />} />
      </Route>

      {/* Main Authenticated Layout Routes */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<LetterDashboardView />} />
        <Route path="/letters/create" element={<CreateLetterView />} />
        <Route path="/letters/:id" element={<LetterDetailView />} />
        <Route path="/settings" element={<SettingsView />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
