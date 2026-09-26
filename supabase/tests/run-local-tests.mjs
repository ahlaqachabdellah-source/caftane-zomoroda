/**
 * Phase 1 local database test runner.
 *
 * Stands up a real, throwaway PostgreSQL (embedded-postgres — no Docker
 * needed), replays the exact Supabase migration chain plus seed data, then
 * executes the RLS/constraint test suite as an unprivileged role.
 *
 * Usage:  npm run test:db
 * Requires devDependencies: embedded-postgres, pg
 */
import EmbeddedPostgres from 'embedded-postgres'
import pg from 'pg'
import { readFileSync, readdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const supabaseDir = path.resolve(__dirname, '..')
// Use the OS temp dir: Postgres requires the data directory to be owned by
// the current user, which cannot be guaranteed inside a mounted project.
const dataDir = path.join(tmpdir(), `caftan-pgtest-${process.pid}`)
const PORT = 55439

const openClients = []
function connect(config) {
  const client = new pg.Client(config)
  // Prevent late socket errors during shutdown from crashing the runner.
  client.on('error', () => {})
  // Surface RAISE NOTICE from the test suite (per-assertion progress).
  client.on('notice', (msg) => console.log('  ' + msg.message))
  openClients.push(client)
  return client.connect().then(() => client)
}

async function runFile(client, file) {
  const sql = readFileSync(file, 'utf8')
  await client.query(sql)
  console.log('  ok  ' + path.relative(supabaseDir, file))
}

async function main() {
  rmSync(dataDir, { recursive: true, force: true })

  const embedded = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: 'postgres',
    password: 'postgres',
    port: PORT,
    persistent: false,
  })

  try {
    console.log('Starting throwaway PostgreSQL...')
    await embedded.initialise()
    await embedded.start()

    const admin = await connect({
      host: '127.0.0.1', port: PORT,
      user: 'postgres', password: 'postgres', database: 'postgres',
    })

    console.log('\n[1/4] Supabase primitives stub (local only)')
    await runFile(admin, path.join(__dirname, 'local', '00_stubs.sql'))

    console.log('\n[2/4] Migrations')
    const migDir = path.join(supabaseDir, 'migrations')
    for (const f of readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort()) {
      await runFile(admin, path.join(migDir, f))
    }
    await runFile(admin, path.join(__dirname, 'local', '01_grants.sql'))

    console.log('\n[3/4] Seed data + test identities')
    await runFile(admin, path.join(supabaseDir, 'seed.sql'))
    await runFile(admin, path.join(__dirname, 'local', '02_test_users.sql'))

    console.log('\n[4/4] RLS / constraint / booking / account / admin suites (as unprivileged role)')
    const tester = await connect({
      host: '127.0.0.1', port: PORT,
      user: 'tester', password: 'tester', database: 'postgres',
    })
    // One session: later phases reuse the pg_temp helpers created by phase 1.
    await runFile(tester, path.join(__dirname, 'phase1_rls_tests.sql'))
    await runFile(tester, path.join(__dirname, 'phase6_booking_tests.sql'))
    await runFile(tester, path.join(__dirname, 'phase7_account_tests.sql'))
    await runFile(tester, path.join(__dirname, 'phase9_admin_tests.sql'))
    await runFile(tester, path.join(__dirname, 'phase9b_admin_reaction_setup.sql'))
    await runFile(tester, path.join(__dirname, 'phase9c_admin_reaction_assert.sql'))
    await runFile(tester, path.join(__dirname, 'phase10_admin_catalog_tests.sql'))
    await runFile(tester, path.join(__dirname, 'phase11_admin_booking_tests.sql'))
    await runFile(tester, path.join(__dirname, 'phase12_validation_tests.sql'))
    await runFile(tester, path.join(__dirname, 'phase13_security_tests.sql'))

    console.log('\nRESULT: ALL DB TESTS PASSED (phase 1 + 6 + 7 + 9 + 10 + 11 + 12 + 13)')
  } catch (err) {
    console.error('\nRESULT: DB TEST RUN FAILED')
    console.error(err.message || err)
    process.exitCode = 1
  } finally {
    for (const client of openClients) {
      await client.end().catch(() => {})
    }
    await embedded.stop().catch(() => {})
    rmSync(dataDir, { recursive: true, force: true })
  }
}

main()
