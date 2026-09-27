/**
 * Phase 17 — backup restore DRILL (logical, local analogue).
 *
 * Hosted Supabase backups are physical (daily snapshots / PITR on paid
 * plans) and can only be triggered from the Supabase dashboard — there is
 * no hosted project reachable from this environment, so a hosted restore
 * CANNOT be performed here and is NOT claimed. What this drill does prove
 * is the restore PROCEDURE against the real schema:
 *
 *   1. Build a "source" database: stubs + migrations + seed.sql (data).
 *   2. Take a logical backup of every public table (JSONB row dump).
 *   3. Build a SEPARATE "target" database: stubs + migrations only.
 *   4. Restore the backup into the target in FK-safe order.
 *   5. Verify: row counts identical, content spot-checks pass, the target
 *      database is fully functional (booking-number trigger fires, RLS
 *      still enabled) — i.e. a restore does not destroy or degrade the
 *      receiving database.
 *
 * Usage:  node supabase/tests/backup-restore-drill.mjs
 */
import EmbeddedPostgres from 'embedded-postgres'
import pg from 'pg'
import { readFileSync, readdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const supabaseDir = path.resolve(__dirname, '..')

const TABLES = ['site_settings', 'categories', 'caftans', 'caftan_images'] // FK-safe order

let passed = 0,
  failed = 0
const check = (label, cond, extra = '') => {
  if (cond) {
    passed++
    console.log(`  PASS ${label}`)
  } else {
    failed++
    console.log(`  FAIL ${label}  ${extra}`)
  }
}

async function makeDb(port, tag, withSeed) {
  const dataDir = path.join(tmpdir(), `caftan-drill-${tag}-${process.pid}`)
  rmSync(dataDir, { recursive: true, force: true })
  const embedded = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: 'postgres',
    password: 'postgres',
    port,
    persistent: false,
  })
  await embedded.initialise()
  await embedded.start()
  const client = new pg.Client({
    host: '127.0.0.1',
    port,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres',
  })
  client.on('error', () => {})
  await client.connect()
  await client.query(readFileSync(path.join(supabaseDir, 'tests/local/00_stubs.sql'), 'utf8'))
  for (const f of readdirSync(path.join(supabaseDir, 'migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    await client.query(readFileSync(path.join(supabaseDir, 'migrations', f), 'utf8'))
  }
  if (withSeed) await client.query(readFileSync(path.join(supabaseDir, 'seed.sql'), 'utf8'))
  return { embedded, client, dataDir }
}

const source = await makeDb(55442, 'source', true)
const target = await makeDb(55443, 'target', false)

try {
  // 1. logical backup from source
  const backup = {}
  for (const t of TABLES) {
    const { rows } = await source.client.query(
      `select coalesce(jsonb_agg(row_data), '[]'::jsonb) as data from (select * from public.${t}) row_data`,
    )
    backup[t] = rows[0].data
  }
  const totalRows = Object.values(backup).reduce((a, rows) => a + rows.length, 0)
  check(`logical backup captured ${totalRows} rows across ${TABLES.length} tables`, totalRows > 0)

  // 2. target starts empty
  for (const t of TABLES) {
    const { rows } = await target.client.query(`select count(*)::int as n from public.${t}`)
    check(`target.${t} starts empty`, rows[0].n === 0)
  }

  // 3. restore into target (FK-safe order), generic column mapping
  for (const t of TABLES) {
    await target.client.query(
      `insert into public.${t} select * from jsonb_populate_recordset(null::public.${t}, $1::jsonb)`,
      [JSON.stringify(backup[t])],
    )
  }

  // 4. verify counts identical
  for (const t of TABLES) {
    const { rows } = await target.client.query(`select count(*)::int as n from public.${t}`)
    check(`restored ${t}: ${rows[0].n}/${backup[t].length} rows`, rows[0].n === backup[t].length)
  }

  // 5. content spot-check (Arabic + French content survives the round-trip)
  const { rows: spot } = await target.client.query(
    `select name from public.caftans order by slug limit 1`,
  )
  const src = await source.client.query(`select name from public.caftans order by slug limit 1`)
  check(
    'content identical after restore (localized JSONB intact)',
    JSON.stringify(spot[0]) === JSON.stringify(src.rows[0]),
  )
  check('Arabic content intact', /[؀-ۿ]/.test(JSON.stringify(spot[0].name)))

  // 6. restored DB is fully functional: trigger + constraints still fire
  const cat = await target.client.query(
    `select id from public.caftans where status = 'available' limit 1`,
  )
  await target.client.query(
    `insert into auth.users (id, email) values ('dddddddd-0000-0000-0000-000000000099', 'drill@example.com') on conflict do nothing`,
  )
  await target.client.query(
    `insert into public.profiles (id, full_name, role) values ('dddddddd-0000-0000-0000-000000000099', 'Drill', 'customer') on conflict do nothing`,
  )
  const ins = await target.client.query(
    `insert into public.bookings (caftan_id, customer_id, start_date, end_date, customer_notes, total_price)
     values ($1, 'dddddddd-0000-0000-0000-000000000099', '2032-05-01', '2032-05-03', 'drill', 0)
     returning booking_number, total_price, status`,
    [cat.rows[0].id],
  )
  check(
    'booking-number trigger fires on restored DB',
    /^CF-\d{4}-\d{4}$/.test(ins.rows[0].booking_number),
    ins.rows[0].booking_number,
  )
  check('total-price trigger recomputes on restored DB', Number(ins.rows[0].total_price) > 0)
  const rls = await target.client.query(
    `select count(*)::int as n from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity`,
  )
  check('RLS still enabled everywhere on restored DB', rls.rows[0].n === 0)

  console.log('\n  NOTE: hosted Supabase snapshot/PITR restore is a dashboard operation on the')
  console.log('  production project — see docs/deployment/backup-restore.md for that procedure.')
} finally {
  for (const db of [source, target]) {
    try {
      await db.client.end()
    } catch {}
    try {
      await db.embedded.stop()
    } catch {}
    rmSync(db.dataDir, { recursive: true, force: true })
  }
}

console.log(`\nRESULT: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
