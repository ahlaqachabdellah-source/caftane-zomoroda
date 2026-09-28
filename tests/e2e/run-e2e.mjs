/**
 * Phase 16/17 — consolidated browser E2E regression against the PRODUCTION
 * build (dist-e2e, built with VITE_SUPABASE_URL pointing at the mock).
 *
 * Covers: smoke (3 locales), the critical customer↔admin journey in French
 * and in Arabic (RTL), error paths, WhatsApp integration, responsive spot
 * checks and API-level security spot checks — all against the stateful
 * Supabase emulation in ./mock-supabase.mjs (RLS, triggers, lifecycle and
 * admin guards enforced server-side by the mock).
 *
 * Run:  node tests/e2e/run-e2e.mjs
 * Requires: dist-e2e build (see package.json "test:e2e"), Playwright global
 * install and a chromium binary.
 */
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { startMock } from './mock-supabase.mjs'

const PLAYWRIGHT = '/home/kimi/.npm-global/lib/node_modules/playwright/index.mjs'
const CHROMIUM = '/usr/bin/chromium'
const ROOT = new URL('..', import.meta.url).pathname // tests/
const DIST = path.join(ROOT, '..', 'dist-e2e')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
}

function serveStatic(dir, port = 0) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x')
    let file = path.join(dir, decodeURIComponent(url.pathname))
    if (!file.startsWith(dir)) {
      res.writeHead(403)
      return res.end()
    }
    if (!existsSync(file) || url.pathname === '/') file = path.join(dir, 'index.html')
    if (!existsSync(file)) file = path.join(dir, 'index.html') // SPA fallback
    try {
      const data = await readFile(file)
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' })
      res.end(data)
    } catch {
      res.writeHead(404)
      res.end()
    }
  })
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () =>
      resolve({
        server,
        port: server.address().port,
        close: () => new Promise((r) => server.close(r)),
      }),
    )
  })
}

// ---------------------------------------------------------------------------
const results = []
let currentSection = ''
function section(name) {
  currentSection = name
  console.log(`\n=== ${name} ===`)
}
function check(name, cond, extra = '') {
  results.push({ section: currentSection, name, pass: Boolean(cond) })
  console.log(`${cond ? '  ✓' : '  ✗ FAIL'} ${name}${cond ? '' : extra ? ` — ${extra}` : ''}`)
}

const { chromium } = await import(PLAYWRIGHT)

// The app build (dist-e2e) has VITE_SUPABASE_URL=http://127.0.0.1:4174
// baked in — the mock MUST listen on that exact port.
const mock = await startMock(4174)
const app = await serveStatic(DIST)
const BASE = `http://127.0.0.1:${app.port}`
const API = `http://127.0.0.1:${mock.port}`
console.log(`mock: ${API}  app: ${BASE}`)

const browser = await chromium.launch({
  executablePath: CHROMIUM,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

async function newPage(viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ viewport, locale: 'fr-FR' })
  const page = await context.newPage()
  page.consoleErrors = []
  page.on('console', (m) => {
    if (m.type() === 'error') page.consoleErrors.push(m.text())
  })
  page.on('pageerror', (e) => page.consoleErrors.push(String(e)))
  return { context, page }
}

const REAL_CONSOLE_ERRORS = (errs) =>
  errs.filter((e) => !/favicon|net::ERR_ABORTED|Download the React DevTools/i.test(e))

try {
  // ------------------------------------------------------------------ smoke
  section('SMOKE — production build, 3 locales')
  for (const [loc, titlePart, dir] of [
    ['fr', 'Caftan Zomoroda', 'ltr'],
    ['ar', 'قفطان زمردة', 'rtl'],
    ['en', 'Caftan Zomoroda', 'ltr'],
  ]) {
    const { context, page } = await newPage()
    await page.goto(`${BASE}/${loc}`, { waitUntil: 'networkidle' })
    check(
      `${loc}: home title localized`,
      (await page.title()).includes(titlePart),
      await page.title(),
    )
    check(`${loc}: html dir=${dir}`, (await page.getAttribute('html', 'dir')) === dir)
    await page.goto(`${BASE}/${loc}/caftans`, { waitUntil: 'networkidle' })
    const cards = await page.locator('a[href*="/caftans/"]').count()
    check(`${loc}: catalog renders seeded caftans`, cards >= 8, `cards=${cards}`)
    check(
      `${loc}: no console errors`,
      REAL_CONSOLE_ERRORS(page.consoleErrors).length === 0,
      REAL_CONSOLE_ERRORS(page.consoleErrors).slice(0, 2).join(' | '),
    )
    await context.close()
  }

  // ------------------------------------------------- critical journey (fr)
  section('JOURNEY FR — register → browse → book → admin confirm → customer status')
  const customer = await newPage()
  const cp = customer.page
  const FR_EMAIL = `fatima-${Date.now()}@example.com`
  await cp.goto(`${BASE}/fr/register`, { waitUntil: 'networkidle' })
  await cp.getByLabel('Nom complet').fill('Fatima Zahra')
  await cp.getByLabel('Email', { exact: true }).fill(FR_EMAIL)
  await cp.getByLabel('Mot de passe', { exact: true }).fill('CustomerPass123!')
  await cp.getByLabel('Confirmer le mot de passe').fill('CustomerPass123!')
  await cp.getByRole('button', { name: 'Créer mon compte' }).click()
  await cp.waitForURL('**/fr/account**', { timeout: 15000 })
  check('fr: registration signs in and lands on account', true)

  await cp.goto(`${BASE}/fr/caftans/caftan-andalou-rouge`, { waitUntil: 'networkidle' })
  check(
    'fr: caftan detail shows name',
    (await cp.getByRole('heading', { name: 'Caftan Andalou Rouge' }).count()) === 1,
  )
  await cp.getByRole('link', { name: 'Réserver ce caftan' }).click()
  await cp.waitForURL('**/fr/caftans/caftan-andalou-rouge/book**')
  await cp.locator('input[type="date"]').first().fill('2026-12-10')
  await cp.locator('input[type="date"]').nth(1).fill('2026-12-12')
  check('fr: estimate shows 3 days × 800 MAD', (await cp.getByText(/2[ .]400/).count()) >= 1)
  await cp.getByRole('button', { name: 'Envoyer ma demande' }).click()
  await cp.getByText('Demande envoyée').waitFor({ timeout: 15000 })
  const frNumber = await cp.locator('text=/CF-\\d{4}-\\d{4}/').first().textContent()
  check('fr: booking created with number', /CF-\d{4}-\d{4}/.test(frNumber ?? ''), frNumber)

  await cp.goto(`${BASE}/fr/account/bookings`, { waitUntil: 'networkidle' })
  check('fr: my bookings shows pending', (await cp.getByText('En attente').count()) >= 1)

  // admin side (separate context, same mock state)
  const admin = await newPage()
  const ap = admin.page
  await ap.goto(`${BASE}/fr/login`, { waitUntil: 'networkidle' })
  await ap.getByLabel('Email', { exact: true }).fill('admin@zomoroda.ma')
  await ap.getByLabel('Mot de passe', { exact: true }).fill('AdminPass123!')
  await ap.getByRole('button', { name: 'Se connecter' }).click()
  await ap.waitForURL('**/fr/account**', { timeout: 15000 })
  await ap.goto(`${BASE}/fr/admin/bookings`, { waitUntil: 'networkidle' })
  check('fr: admin sees the new booking', (await ap.getByText('Fatima Zahra').count()) >= 1)
  await ap.getByRole('link', { name: /Fatima Zahra/ }).click()
  await ap.waitForURL('**/fr/admin/bookings/**')
  await ap.getByRole('button', { name: 'Confirmer', exact: true }).click()
  await ap.getByRole('button', { name: 'Confirmer', exact: true }).last().click() // dialog action
  await ap.getByText('Confirmée').first().waitFor({ timeout: 15000 })
  check('fr: admin confirmed the booking', true)

  await cp.goto(`${BASE}/fr/account/bookings`, { waitUntil: 'networkidle' })
  check('fr: customer sees confirmed status', (await cp.getByText('Confirmée').count()) >= 1)
  await cp.goto(`${BASE}/fr/account/bookings/${frNumber.trim()}`, { waitUntil: 'networkidle' })
  check(
    'fr: booking detail timeline shows confirmation',
    (await cp.getByText('Confirmée').count()) >= 1,
  )

  // ------------------------------------------------- critical journey (ar)
  section('JOURNEY AR — RTL end-to-end')
  const arCtx = await newPage()
  const arp = arCtx.page
  const AR_EMAIL = `fatimaz-${Date.now()}@example.com`
  await arp.goto(`${BASE}/ar/register`, { waitUntil: 'networkidle' })
  check('ar: register page is RTL', (await arp.getAttribute('html', 'dir')) === 'rtl')
  await arp.getByLabel('الاسم الكامل').fill('فاطمة الزهراء')
  await arp.getByLabel('البريد الإلكتروني', { exact: true }).fill(AR_EMAIL)
  await arp.getByLabel('كلمة المرور', { exact: true }).fill('CustomerPass123!')
  await arp.getByLabel('تأكيد كلمة المرور').fill('CustomerPass123!')
  await arp.getByRole('button', { name: 'إنشاء حسابي' }).click()
  await arp.waitForURL('**/ar/account**', { timeout: 15000 })
  check(
    'ar: registration signs in (RTL account)',
    (await arp.getAttribute('html', 'dir')) === 'rtl',
  )

  await arp.goto(`${BASE}/ar/caftans/caftan-andalou-rouge`, { waitUntil: 'networkidle' })
  await arp.getByRole('link', { name: 'احجزي هذا القفطان' }).click()
  await arp.waitForURL('**/ar/caftans/caftan-andalou-rouge/book**')
  await arp.locator('input[type="date"]').first().fill('2027-01-15')
  await arp.locator('input[type="date"]').nth(1).fill('2027-01-17')
  await arp.getByRole('button', { name: 'إرسال طلبي' }).click()
  await arp.getByText('تم إرسال الطلب').waitFor({ timeout: 15000 })
  check('ar: booking created in Arabic flow', true)
  await arp.goto(`${BASE}/ar/account/bookings`, { waitUntil: 'networkidle' })
  check(
    'ar: my bookings shows pending (في الانتظار)',
    (await arp.getByText('في الانتظار').count()) >= 1,
  )
  check('ar: bookings page still RTL', (await arp.getAttribute('html', 'dir')) === 'rtl')

  // ------------------------------------------------------------- error paths
  section('ERROR PATHS')
  const anon = await newPage()
  const xp = anon.page
  await xp.goto(`${BASE}/fr/login`, { waitUntil: 'networkidle' })
  await xp.getByLabel('Email', { exact: true }).fill('nobody@example.com')
  await xp.getByLabel('Mot de passe', { exact: true }).fill('WrongPass123!')
  await xp.getByRole('button', { name: 'Se connecter' }).click()
  await xp.getByText('Email ou mot de passe incorrect').waitFor({ timeout: 10000 })
  check('errors: invalid credentials message', true)

  await xp.goto(`${BASE}/fr/caftans/does-not-exist`, { waitUntil: 'networkidle' })
  check(
    'errors: missing caftan → Caftan introuvable',
    (await xp.getByText('Caftan introuvable').count()) >= 1,
  )
  await xp.goto(`${BASE}/fr/no-such-page`, { waitUntil: 'networkidle' })
  check(
    'errors: unknown route → Page introuvable',
    (await xp.getByText('Page introuvable').count()) >= 1,
  )
  await xp.goto(`${BASE}/fr/admin`, { waitUntil: 'networkidle' })
  check('errors: anonymous → /admin redirects to login', xp.url().includes('/fr/login'), xp.url())

  // logged-in customer hits /admin → access denied
  await cp.goto(`${BASE}/fr/admin`, { waitUntil: 'networkidle' })
  check(
    'errors: customer → /admin shows Accès réservé',
    (await cp.getByText('Accès réservé').count()) >= 1,
  )

  // overlap conflict: second customer picks dates overlapping the
  // confirmed fr booking → occupied-dates guard fires BEFORE submit
  // (inline error + disabled button); the server-side 23P01 path is
  // verified headlessly in the security section below.
  const second = await newPage()
  const sp = second.page
  const S_EMAIL = `second-${Date.now()}@example.com`
  await sp.goto(`${BASE}/fr/register`, { waitUntil: 'networkidle' })
  await sp.getByLabel('Nom complet').fill('Second Customer')
  await sp.getByLabel('Email', { exact: true }).fill(S_EMAIL)
  await sp.getByLabel('Mot de passe', { exact: true }).fill('CustomerPass123!')
  await sp.getByLabel('Confirmer le mot de passe').fill('CustomerPass123!')
  await sp.getByRole('button', { name: 'Créer mon compte' }).click()
  await sp.waitForURL('**/fr/account**', { timeout: 15000 })
  await sp.goto(`${BASE}/fr/caftans/caftan-andalou-rouge/book`, { waitUntil: 'networkidle' })
  await sp.locator('input[type="date"]').first().fill('2026-12-11')
  await sp.locator('input[type="date"]').nth(1).fill('2026-12-13')
  await sp.getByText(/chevauche une réservation existante/).waitFor({ timeout: 15000 })
  check('errors: occupied dates → inline overlap warning before submit', true)
  check(
    'errors: submit disabled while dates overlap',
    await sp.getByRole('button', { name: 'Envoyer ma demande' }).isDisabled(),
  )
  // Non-overlapping dates re-enable the form.
  await sp.locator('input[type="date"]').first().fill('2027-03-01')
  await sp.locator('input[type="date"]').nth(1).fill('2027-03-03')
  await sp.waitForTimeout(500)
  check(
    'errors: free dates re-enable submit',
    await sp.getByRole('button', { name: 'Envoyer ma demande' }).isEnabled(),
  )

  // ---------------------------------------------------------------- WhatsApp
  section('WHATSAPP')
  const wa = await newPage()
  const wp = wa.page
  await wp.goto(`${BASE}/fr`, { waitUntil: 'networkidle' })
  const float = wp.getByRole('link', { name: 'Discuter avec Caftan Zomoroda sur WhatsApp' })
  check('wa: float visible with FR aria-label', (await float.count()) === 1)
  const href = await float.getAttribute('href')
  check(
    'wa: float href targets wa.me/212600000000 with prefilled text',
    Boolean(href?.startsWith('https://wa.me/212600000000') && href.includes('text=')),
    href,
  )
  await wp.goto(`${BASE}/ar`, { waitUntil: 'networkidle' })
  check(
    'wa: float visible with AR aria-label',
    (await wp.getByRole('link', { name: 'تحدثي مع قفطان زمردة عبر واتساب' }).count()) === 1,
  )

  // WhatsApp as primary contact CTA (hero, detail page, contact page)
  await wp.goto(`${BASE}/fr`, { waitUntil: 'networkidle' })
  const heroWa = wp.getByRole('link', { name: 'Discuter sur WhatsApp' }).first()
  check('wa: hero CTA visible FR', (await heroWa.count()) === 1)
  const heroHref = await heroWa.getAttribute('href')
  check(
    'wa: hero CTA carries the exact home message',
    Boolean(
      heroHref?.startsWith('https://wa.me/212600000000?text=') &&
      heroHref.includes(
        encodeURIComponent(
          'Bonjour, je souhaite avoir plus d’informations sur la location de caftans.',
        ),
      ),
    ),
    heroHref,
  )
  await wp.goto(`${BASE}/fr/caftans/caftan-andalou-rouge`, { waitUntil: 'networkidle' })
  const detailWa = wp.getByRole('link', { name: 'Demander la disponibilité sur WhatsApp' })
  check('wa: detail-page CTA visible FR', (await detailWa.count()) === 1)
  const detailHref = await detailWa.getAttribute('href')
  check(
    'wa: detail CTA carries the exact product message',
    Boolean(
      detailHref?.startsWith('https://wa.me/212600000000?text=') &&
      detailHref.includes(
        encodeURIComponent(
          'Bonjour, je suis intéressée par ce caftan et je souhaite connaître sa disponibilité.',
        ),
      ),
    ),
    detailHref,
  )
  await wp.goto(`${BASE}/fr/contact`, { waitUntil: 'networkidle' })
  const contactWa = wp.getByRole('link', { name: 'Nous contacter sur WhatsApp' })
  check('wa: contact page CTA visible FR', (await contactWa.count()) === 1)
  const contactHref = await contactWa.getAttribute('href')
  check(
    'wa: contact CTA carries the exact contact message',
    Boolean(
      contactHref?.startsWith('https://wa.me/212600000000?text=') &&
      contactHref.includes(encodeURIComponent('Bonjour, je souhaite contacter Caftane Zomoroda.')),
    ),
    contactHref,
  )
  check(
    'wa: contact page shows real address and hours',
    (await wp.getByText(/Quissariat Al Khalil/).count()) >= 1 &&
      (await wp.getByText(/10:00–20:00/).count()) >= 1,
  )
  await wp.goto(`${BASE}/ar/contact`, { waitUntil: 'networkidle' })
  const arContactWa = wp.getByRole('link', { name: 'تواصلي معنا عبر واتساب' })
  check(
    'wa: contact page CTA localized AR with AR message',
    (await arContactWa.count()) === 1 &&
      Boolean(
        (await arContactWa.getAttribute('href'))?.includes(
          encodeURIComponent('مرحباً، أودّ التواصل مع قفطان زمردة.'),
        ),
      ),
  )

  // ------------------------------------------- catalog filters (audit fix)
  section('CATALOG FILTERS — size, sort, availability dates')
  const cf = await newPage()
  const cfp = cf.page
  await cfp.goto(`${BASE}/fr/caftans`, { waitUntil: 'networkidle' })
  await cfp.getByLabel('Taille').selectOption('S')
  await cfp.waitForTimeout(400)
  check(
    'filters: size=S hides M caftan',
    (await cfp.locator('main a[href*="caftan-andalou-rouge"]').count()) === 0,
  )
  check(
    'filters: size=S keeps S caftan',
    (await cfp.locator('main a[href*="takchita-royale-doree"]').count()) >= 1,
  )
  await cfp.getByLabel('Taille').selectOption('')
  await cfp.getByLabel('Trier').selectOption('price_desc')
  await cfp.waitForTimeout(400)
  const firstCard = await cfp.locator('main a[href*="/caftans/"]').first().getAttribute('href')
  check(
    'filters: sort price_desc puts 1800 MAD caftan first',
    Boolean(firstCard?.includes('caftan-blanc-mariee')),
    firstCard,
  )
  // availability: 2026-12-10→12 overlaps the confirmed fr booking of
  // caftan-andalou-rouge → it disappears from the results.
  await cfp.getByLabel('Trier').selectOption('featured')
  await cfp.locator('#catalog-from').fill('2026-12-10')
  await cfp.locator('#catalog-to').fill('2026-12-12')
  await cfp.waitForTimeout(800)
  check(
    'filters: booked caftan excluded for occupied range',
    (await cfp.locator('main a[href*="caftan-andalou-rouge"]').count()) === 0,
  )
  check(
    'filters: free caftan still listed for that range',
    (await cfp.locator('main a[href*="takchita-royale-doree"]').count()) >= 1,
  )
  await cfp.getByRole('button', { name: 'Effacer les dates' }).click()
  await cfp.waitForTimeout(800)
  check(
    'filters: clearing dates restores the caftan',
    (await cfp.locator('main a[href*="caftan-andalou-rouge"]').count()) >= 1,
  )

  // -------------------------------------- real business info (audit fix)
  section('BUSINESS INFO — real address / hours / plus code')
  const bi = await newPage()
  const bip = bi.page
  await bip.goto(`${BASE}/fr`, { waitUntil: 'networkidle' })
  check(
    'footer: real address shown (FR)',
    (await bip.getByText(/Quissariat Al Khalil/).count()) >= 1,
  )
  check('footer: opening hours shown', (await bip.getByText(/10:00–20:00/).count()) >= 1)
  const mapLink = await bip.locator('footer a[href*="google.com/maps"]').getAttribute('href')
  check('footer: plus-code map link', Boolean(mapLink?.includes('9QVP%2BM8G')), mapLink)
  await bip.goto(`${BASE}/ar`, { waitUntil: 'networkidle' })
  check('footer: real address shown (AR)', (await bip.getByText(/قسارية الخليل/).count()) >= 1)
  // LocalBusiness JSON-LD carries the real address + hours
  const ldJson = await bip.evaluate(() =>
    [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map((s) => s.textContent)
      .join(' '),
  )
  check(
    'seo: LocalBusiness JSON-LD has PostalAddress',
    ldJson.includes('PostalAddress') && ldJson.includes('addressCountry'),
  )
  check(
    'seo: LocalBusiness JSON-LD has openingHoursSpecification',
    ldJson.includes('OpeningHoursSpecification'),
  )

  // -------------------------------------------------------------- responsive
  section('RESPONSIVE SPOT — 390px mobile')
  for (const loc of ['fr', 'ar']) {
    const { context, page } = await newPage({ width: 390, height: 844 })
    await page.goto(`${BASE}/${loc}`, { waitUntil: 'networkidle' })
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    check(`${loc}: no horizontal overflow @390px`, overflow <= 1, `overflow=${overflow}px`)
    await page.goto(`${BASE}/${loc}/caftans`, { waitUntil: 'networkidle' })
    const overflow2 = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    check(`${loc}: catalog no overflow @390px`, overflow2 <= 1, `overflow=${overflow2}px`)
    await context.close()
  }

  // ------------------------------------------------- API-level security spot
  section('SECURITY SPOT — API level against the mock')
  // customer token cannot call admin RPC
  const loginRes = await fetch(`${API}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: FR_EMAIL, password: 'CustomerPass123!' }),
  }).then((r) => r.json())
  const custTok = loginRes.access_token
  const rpcRes = await fetch(`${API}/rest/v1/rpc/admin_list_bookings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${custTok}` },
    body: '{}',
  })
  check(
    'sec: customer → admin RPC denied (42501)',
    rpcRes.status === 400 && (await rpcRes.json()).code === '42501',
  )
  // role self-promotion ignored
  const me = await fetch(`${API}/auth/v1/user`, {
    headers: { authorization: `Bearer ${custTok}` },
  }).then((r) => r.json())
  await fetch(`${API}/rest/v1/profiles?id=eq.${me.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${custTok}` },
    body: JSON.stringify({ role: 'admin', city: 'Rabat' }),
  })
  const prof = await fetch(`${API}/rest/v1/profiles?id=eq.${me.id}`, {
    headers: { authorization: `Bearer ${custTok}`, accept: 'application/vnd.pgrst.object+json' },
  }).then((r) => r.json())
  check('sec: role self-promotion impossible', prof.role === 'customer', `role=${prof.role}`)
  check('sec: non-role profile update works', prof.city === 'Rabat')
  // anonymous cannot read bookings
  const anonBookings = await fetch(`${API}/rest/v1/bookings?select=*`)
  check('sec: anonymous → bookings denied', anonBookings.status === 401)
  // customer cannot read another customer's bookings
  const other = await fetch(`${API}/rest/v1/bookings?select=*`, {
    headers: { authorization: `Bearer ${custTok}` },
  }).then((r) => r.json())
  check(
    'sec: bookings scoped to caller (RLS)',
    Array.isArray(other) &&
      other.every((b) => b.customer_id === me.id) &&
      !other.some((b) => b.customer_id !== me.id),
  )

  // DB-level overlap guard still fires headlessly (23P01) even if the
  // client-side warning were bypassed.
  const overlapPost = await fetch(`${API}/rest/v1/bookings`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${custTok}`,
      prefer: 'return=representation',
    },
    body: JSON.stringify({
      caftan_id: '20000000-0000-0000-0000-000000000001',
      customer_id: me.id,
      start_date: '2026-12-11',
      end_date: '2026-12-13',
      customer_notes: '',
      total_price: 0,
    }),
  })
  check(
    'sec: server-side overlap still rejected (23P01)',
    overlapPost.status === 409 && (await overlapPost.json()).code === '23P01',
  )

  // admin lifecycle guard: rejected transition rejected→confirmed fails
  const adminTok = await fetch(`${API}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@zomoroda.ma', password: 'AdminPass123!' }),
  })
    .then((r) => r.json())
    .then((j) => j.access_token)
  const arBooking = mock.db.bookings.find((b) => b.start_date === '2027-01-15')
  const bad = await fetch(`${API}/rest/v1/rpc/admin_update_booking_status`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${adminTok}` },
    body: JSON.stringify({ p_booking_id: arBooking.id, p_new_status: 'completed' }),
  })
  check(
    'sec: invalid lifecycle transition rejected (pending→completed)',
    bad.status === 400 && (await bad.json()).code === '22023',
  )
} finally {
  await browser.close()
  await mock.close()
  await app.close()
}

const failed = results.filter((r) => !r.pass)
console.log(`\n========================================`)
console.log(
  `E2E RESULT: ${results.length - failed.length} passed, ${failed.length} failed, ${results.length} total`,
)
if (failed.length) {
  for (const f of failed) console.log(`  FAILED [${f.section}] ${f.name}`)
  process.exit(1)
}
console.log('ALL E2E CHECKS PASSED')
