/**
 * Phase 17 — production migration verification.
 *
 * Proves the migration chain applies CLEANLY, in order, to a completely
 * fresh database (embedded PostgreSQL — same engine Supabase runs), then
 * asserts the production structure exists:
 *   tables, indexes, constraints (incl. the double-booking exclusion),
 *   triggers, functions (incl. the Phase 13 rate limiter), RLS enabled
 *   with the full policy set, and the storage bucket hardening.
 *
 * Supabase-internal schemas (auth.*, storage.*) are emulated by
 * tests/local/00_stubs.sql — on a hosted project those schemas already
 * exist natively, so the same migrations apply unchanged.
 *
 * Usage:  node supabase/tests/verify-fresh-migrations.mjs
 */
import EmbeddedPostgres from 'embedded-postgres'
import pg from 'pg'
import { readFileSync, readdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const supabaseDir = path.resolve(__dirname, '..')
const dataDir = path.join(tmpdir(), `caftan-freshmig-${process.pid}`)
const PORT = 55441

let passed = 0
let failed = 0
function check(label, cond, extra = '') {
  if (cond) { passed++; console.log(`  PASS ${label}`) }
  else { failed++; console.log(`  FAIL ${label}  ${extra}`) }
}

const embedded = new EmbeddedPostgres({
  databaseDir: dataDir, user: 'postgres', password: 'postgres', port: PORT, persistent: false,
})

try {
  console.log('Starting fresh PostgreSQL (no data, no schema)...')
  await embedded.initialise()
  await embedded.start()
  const admin = new pg.Client({ host: '127.0.0.1', port: PORT, user: 'postgres', password: 'postgres', database: 'postgres' })
  admin.on('error', () => {})
  await admin.connect()

  // Supabase-internal prerequisites (auth.users, storage.buckets, …)
  await admin.query(readFileSync(path.join(supabaseDir, 'tests/local/00_stubs.sql'), 'utf8'))

  // Apply migrations in filename order — exactly what `supabase db push` does.
  const migrations = readdirSync(path.join(supabaseDir, 'migrations')).filter((f) => f.endsWith('.sql')).sort()
  console.log(`Applying ${migrations.length} migrations in order...`)
  for (const f of migrations) {
    await admin.query(readFileSync(path.join(supabaseDir, 'migrations', f), 'utf8'))
    console.log('  ok  ' + f)
  }
  check('all migrations apply cleanly to a fresh database', true)

  const q = (sql, params) => admin.query(sql, params).then((r) => r.rows)

  // ---- tables ----
  const tables = (await q(`select tablename from pg_tables where schemaname = 'public'`)).map((r) => r.tablename)
  for (const t of ['profiles', 'categories', 'caftans', 'caftan_images', 'bookings', 'booking_status_history', 'booking_admin_notes', 'site_settings']) {
    check(`table public.${t} exists`, tables.includes(t))
  }

  // ---- indexes (incl. Phase 14 performance set) ----
  const indexes = (await q(`select indexname from pg_indexes where schemaname = 'public'`)).map((r) => r.indexname)
  for (const ix of ['bookings_created_at_idx', 'booking_status_history_created_idx', 'profiles_role_created_idx']) {
    check(`index ${ix} exists`, indexes.includes(ix))
  }
  check(`at least 10 indexes total (${indexes.length})`, indexes.length >= 10)

  // ---- constraints ----
  const constraints = (await q(`select conname, contype from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace where n.nspname = 'public'`))
  check('double-booking exclusion constraint exists', constraints.some((c) => c.contype === 'x'))
  check('foreign keys present', constraints.filter((c) => c.contype === 'f').length >= 5)
  check('check constraints present', constraints.filter((c) => c.contype === 'c').length >= 5)
  check('unique constraints present', constraints.some((c) => c.contype === 'u'))

  // ---- triggers ----
  const triggers = (await q(`select tgname from pg_trigger where not tgisinternal`)).map((r) => r.tgname)
  for (const tg of ['generate_booking_number_on_insert', 'throttle_booking_creation_on_insert']) {
    check(`trigger ${tg} exists`, triggers.includes(tg))
  }

  // ---- functions ----
  const functions = (await q(`select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'`)).map((r) => r.proname)
  for (const fn of ['compute_booking_total', 'generate_booking_number', 'throttle_booking_creation', 'is_admin', 'admin_list_bookings', 'admin_get_booking', 'admin_update_booking_status', 'admin_dashboard_kpis', 'admin_list_customers']) {
    check(`function ${fn}() exists`, functions.includes(fn))
  }

  // ---- RLS ----
  const rls = await q(`select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'`)
  const unprotected = rls.filter((r) => !r.relrowsecurity).map((r) => r.relname)
  check('RLS enabled on EVERY public table', unprotected.length === 0, unprotected.join(','))
  const policies = await q(`select schemaname, tablename, policyname from pg_policies`)
  const publicPolicies = policies.filter((p) => p.schemaname === 'public')
  check(`at least 23 public-table policies (${publicPolicies.length})`, publicPolicies.length >= 23)
  const tablesWithPolicies = new Set(publicPolicies.map((p) => p.tablename))
  const rlsTablesNoPolicy = rls.filter((r) => r.relrowsecurity && !tablesWithPolicies.has(r.relname)).map((r) => r.relname)
  check('every RLS-enabled table has at least one policy', rlsTablesNoPolicy.length === 0, rlsTablesNoPolicy.join(','))
  const storagePolicies = policies.filter((p) => p.schemaname === 'storage')
  check(`storage policies configured (${storagePolicies.length})`, storagePolicies.length >= 4)

  // ---- storage bucket + Phase 13 hardening ----
  const buckets = await q(`select id, public, allowed_mime_types, file_size_limit from storage.buckets`)
  const bucket = buckets.find((b) => b.id === 'caftan-images')
  check('storage bucket caftan-images exists and is public', !!bucket && bucket.public === true)
  check('bucket MIME allowlist hardened', Array.isArray(bucket?.allowed_mime_types) && bucket.allowed_mime_types.includes('image/webp') && !bucket.allowed_mime_types.includes('*'))
  check('bucket size limit = 10 MB', Number(bucket?.file_size_limit) === 10485760)

  // ---- seed/config requirements (documented, not auto-applied) ----
  const settings = await q(`select count(*)::int as n from public.site_settings`)
  console.log(`  INFO site_settings rows after migrations: ${settings[0].n} (production WhatsApp number is entered by the business via admin/SQL — see docs/deployment)`)

  await admin.end()
} catch (err) {
  failed++
  console.error('MIGRATION VERIFICATION ERROR:', err.message)
} finally {
  try { await embedded.stop() } catch {}
  rmSync(dataDir, { recursive: true, force: true })
}

console.log(`\nRESULT: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
