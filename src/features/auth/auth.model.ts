export type UserRole = 'drafter' | 'reviewer' | 'approver' | 'admin'

export interface User {
  uid: string
  email: string
  name: string
  role: UserRole
  signatureUrl?: string
  avatarUrl?: string
  createdAt?: string
  updatedAt?: string
}

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}
