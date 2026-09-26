import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient'
import { DEFAULT_LOCALE, isSupportedLocale } from '@/lib/locale'
import i18n from '@/i18n'
import type { Profile } from '@/types/database.types'
import { AuthContext, type AuthContextValue } from './auth-context'

/**
 * Central authentication state (Phase 2).
 *
 * Wraps Supabase Auth: session lifecycle, profile/role loading, and all
 * auth actions. When the backend env vars are not configured the context
 * reports `configured: false` and stays signed out instead of crashing —
 * auth pages then show a configuration notice (no mocked sessions).
 */

/** Map Supabase Auth error messages to user-facing French messages. */
function mapAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials'))
    return 'Email ou mot de passe incorrect.'
  if (m.includes('email not confirmed'))
    return 'Veuillez confirmer votre email avant de vous connecter.'
  if (m.includes('user already registered'))
    return 'Un compte existe déjà avec cet email.'
  if (m.includes('password') && m.includes('at least'))
    return 'Le mot de passe est trop court.'
  if (m.includes('rate limit'))
    return 'Trop de tentatives. Veuillez réessayer dans quelques minutes.'
  return 'Une erreur est survenue. Veuillez réessayer.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  // Without a configured backend there is nothing to resolve: start settled.
  const [loading, setLoading] = useState(() => isSupabaseConfigured)

  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) return null
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) {
      // Profile row missing (e.g. trigger delay right after signup) — the
      // session stays valid, the user just has no role yet.
      return null
    }
    return data
  }, [])

  useEffect(() => {
    if (!supabase) return

    let cancelled = false

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return
      const initial = data.session
      setSession(initial)
      if (initial?.user) {
        const p = await loadProfile(initial.user.id)
        if (!cancelled) setProfile(p)
      }
      if (!cancelled) setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession?.user) {
        // Deferred to avoid deadlocking the auth listener's internal lock.
        setTimeout(() => {
          void loadProfile(nextSession.user.id).then(setProfile)
        }, 0)
      } else {
        setProfile(null)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn = useCallback<AuthContextValue['signIn']>(async (email, password) => {
    if (!supabase) return { error: 'Backend non configuré.' }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: mapAuthError(error.message) }
    return { error: null, session: data.session }
  }, [])

  const signUp = useCallback<AuthContextValue['signUp']>(async (input) => {
    if (!supabase) return { error: 'Backend non configuré.' }
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          full_name: input.fullName,
          phone: input.phone || null,
        },
      },
    })
    if (error) return { error: mapAuthError(error.message) }
    // With email confirmation enabled, data.session is null until confirmed.
    return { error: null, session: data.session }
  }, [])

  const sendPasswordReset = useCallback<AuthContextValue['sendPasswordReset']>(
    async (email) => {
      if (!supabase) return { error: 'Backend non configuré.' }
      const locale = isSupportedLocale(i18n.language) ? i18n.language : DEFAULT_LOCALE
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/${locale}/reset-password`,
      })
      if (error) return { error: mapAuthError(error.message) }
      return { error: null }
    },
    [],
  )

  const updatePassword = useCallback<AuthContextValue['updatePassword']>(
    async (password) => {
      if (!supabase) return { error: 'Backend non configuré.' }
      const { error } = await supabase.auth.updateUser({ password })
      if (error) return { error: mapAuthError(error.message) }
      return { error: null }
    },
    [],
  )

  const refreshProfile = useCallback(async () => {
    if (!supabase) return
    const { data } = await supabase.auth.getSession()
    const currentUser = data.session?.user
    if (!currentUser) return
    const p = await loadProfile(currentUser.id)
    setProfile(p)
  }, [loadProfile])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    const user = session?.user ?? null
    const role = profile?.role ?? null
    return {
      session,
      user,
      profile,
      role,
      isAdmin: role === 'admin',
      loading,
      configured: isSupabaseConfigured,
      signIn,
      signUp,
      sendPasswordReset,
      updatePassword,
      refreshProfile,
      signOut,
    }
  }, [session, profile, loading, signIn, signUp, sendPasswordReset, updatePassword, refreshProfile, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
