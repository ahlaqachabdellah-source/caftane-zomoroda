/**
 * Phase 15 — sitemap generator (runs after `vite build`).
 *
 * Emits dist/sitemap.xml with every indexable public URL:
 *   /{fr,ar,en}  and  /{fr,ar,en}/caftans  (static public routes)
 *   /{fr,ar,en}/caftans/{slug}             (real slugs from the database)
 *
 * Never includes admin / account / auth / booking routes.
 *
 * Requirements:
 *   VITE_SITE_URL        public origin (sitemap URLs must be absolute)
 *   VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY  to fetch real caftan slugs
 * Without Supabase env the static routes are still emitted; without
 * VITE_SITE_URL the script skips with a warning (never fails the build).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Minimal .env.local / .env reader (no dependency).
for (const name of ['.env.local', '.env']) {
  const p = path.join(root, name)
  if (!existsSync(p)) continue
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}

const SITE = (process.env.VITE_SITE_URL || '').replace(/\/+$/, '')
const SB_URL = process.env.VITE_SUPABASE_URL
const SB_KEY = process.env.VITE_SUPABASE_ANON_KEY
const LOCALES = ['fr', 'ar', 'en']
const STATIC_PATHS = ['/', '/caftans']

if (!SITE) {
  console.warn('[sitemap] VITE_SITE_URL not set — skipping sitemap generation (build unaffected).')
  process.exit(0)
}

async function fetchCaftanSlugs() {
  if (!SB_URL || !SB_KEY) {
    console.warn('[sitemap] Supabase env not set — sitemap will contain static routes only.')
    return []
  }
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/caftans?select=slug,updated_at&status=neq.retired&order=slug`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } },
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const rows = await res.json()
    return rows.map((r) => ({ slug: r.slug, updated: r.updated_at }))
  } catch (err) {
    // Build machines may not reach Supabase — degrade gracefully instead of
    // failing the build; static localized routes are still emitted.
    console.warn(`[sitemap] could not fetch caftan slugs (${err.message}) — static routes only.`)
    return []
  }
}

const slugs = await fetchCaftanSlugs()
const today = new Date().toISOString().slice(0, 10)

const urls = []
for (const locale of LOCALES) {
  for (const p of STATIC_PATHS) {
    urls.push({ loc: `${SITE}/${locale}${p === '/' ? '' : p}`, lastmod: today, priority: p === '/' ? '1.0' : '0.9' })
  }
  for (const { slug, updated } of slugs) {
    urls.push({
      loc: `${SITE}/${locale}/caftans/${slug}`,
      lastmod: (updated || today).slice(0, 10),
      priority: '0.8',
    })
  }
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`

writeFileSync(path.join(root, 'dist', 'sitemap.xml'), xml)
console.log(`[sitemap] wrote ${urls.length} URLs (${slugs.length} caftans x ${LOCALES.length} locales + static)`)

// Advertise the sitemap in robots.txt (absolute URL required).
const robotsPath = path.join(root, 'dist', 'robots.txt')
if (existsSync(robotsPath)) {
  const robots = readFileSync(robotsPath, 'utf8')
  if (!/^Sitemap:/m.test(robots)) {
    writeFileSync(robotsPath, `${robots.trimEnd()}\n\nSitemap: ${SITE}/sitemap.xml\n`)
  }
}
