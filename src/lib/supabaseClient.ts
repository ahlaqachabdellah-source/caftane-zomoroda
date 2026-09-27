import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

/**
 * Supabase client singleton.
 *
 * Configuration comes from Vite env vars (see .env.example):
 *   VITE_SUPABASE_URL       — https://<project-ref>.supabase.co
 *   VITE_SUPABASE_ANON_KEY  — public anon key (safe for the browser; every
 *                             table is protected by Row Level Security)
 *
 * The service-role key must NEVER appear here or anywhere in the frontend.
 * Until the env vars are set (Phase 2 wiring), `supabase` is null and the
 * app must treat backend access as unavailable — no mocked data.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured: boolean = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl as string, supabaseAnonKey as string)
  : null

/**
 * Accessor for features that require a configured backend.
 * Throws a clear error instead of failing with a null dereference.
 */
export function getSupabase(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and ' +
        'VITE_SUPABASE_ANON_KEY (see .env.example).',
    )
  }
  return supabase
}
