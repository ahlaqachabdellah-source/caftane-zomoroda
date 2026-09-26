import { createContext, useContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { Profile, UserRole } from '@/types/database.types'

/**
 * Auth context definition + consumer hook.
 * Kept in a non-component module so AuthProvider.tsx only exports the
 * provider component (fast-refresh friendly) and the hook stays mockable
 * in tests via '@/hooks/useAuth'.
 */

export type AuthResult = {
  error: string | null
  /** Present when the action produced an active session immediately */
  session?: Session | null
}

export type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: Profile | null
  role: UserRole | null
  isAdmin: boolean
  loading: boolean
  configured: boolean
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (input: {
    email: string
    password: string
    fullName: string
    phone?: string
  }) => Promise<AuthResult>
  sendPasswordReset: (email: string) => Promise<AuthResult>
  updatePassword: (password: string) => Promise<AuthResult>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return ctx
}
