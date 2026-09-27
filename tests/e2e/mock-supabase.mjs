/**
 * Phase 16/17 — stateful Supabase emulation for browser E2E tests.
 *
 * A faithful in-memory re-implementation of the REAL backend contract the
 * frontend talks to, derived directly from supabase/migrations/*.sql and
 * supabase/seed.sql:
 *   - GoTrue auth: signup / token(password) / user / logout / recover / update
 *     Session shape is TOP-LEVEL ({access_token, refresh_token, ...}) exactly
 *     like GoTrue — supabase-js drops sessions nested under `session`.
 *   - PostgREST: select/eq/neq/order/single/maybeSingle emulation for
 *     profiles, site_settings, categories, caftans, caftan_images, bookings,
 *     booking_status_history.
 *   - RLS semantics: bookings are filtered to the caller; INSERT requires
 *     customer_id = caller; the exclusion constraint (overlap on the same
 *     caftan with pending/confirmed status) raises 23P01; PATCH (cancel)
 *     only from status 'pending'.
 *   - Trigger semantics: booking_number CF-YYYY-NNNN, total = days x
 *     price_per_day, status history rows on insert and on every transition.
 *   - Admin RPCs (security definer, is_admin() guard → 42501):
 *     admin_dashboard_kpis, admin_recent_activity, admin_list_bookings,
 *     admin_get_booking, admin_update_booking_status (lifecycle-guarded),
 *     admin_set_booking_notes, admin_list_customers, admin_get_customer,
 *     admin_caftan_occupancy.
 *   - Storage: public object + render/image GET return a 1x1 PNG.
 *
 * Seeded with the real seed.sql catalog (10 caftans, 3 categories) plus an
 * admin account admin@zomoroda.ma / AdminPass123! (test-only, never in the
 * application bundle).
 */
import http from 'node:http'
import { randomUUID } from 'node:crypto'

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

// ---------------------------------------------------------------------------
// Seed (mirrors supabase/seed.sql)
// ---------------------------------------------------------------------------
function seed() {
  const categories = [
    { id: '10000000-0000-0000-0000-000000000001', slug: 'caftan', name: { ar: 'قفطان', fr: 'Caftan', en: 'Caftan' }, description: { ar: 'قفطان مغربي تقليدي بقطعة واحدة', fr: 'Le caftan marocain traditionnel en une pièce', en: 'The traditional one-piece Moroccan caftan' }, sort_order: 1, created_at: '2026-09-26T12:00:00Z' },
    { id: '10000000-0000-0000-0000-000000000002', slug: 'takchita', name: { ar: 'تكشيطة', fr: 'Takchita', en: 'Takchita' }, description: { ar: 'تكشيطة من قطعتين بأناقة ملكية', fr: 'La takchita deux pièces, élégance royale', en: 'The two-piece takchita, royal elegance' }, sort_order: 2, created_at: '2026-09-26T12:00:00Z' },
    { id: '10000000-0000-0000-0000-000000000003', slug: 'jellaba', name: { ar: 'جلابة', fr: 'Jellaba', en: 'Jellaba' }, description: { ar: 'جلابة عصرية ومريحة لجميع المناسبات', fr: 'La jellaba moderne et confortable pour toutes les occasions', en: 'The modern, comfortable jellaba for every occasion' }, sort_order: 3, created_at: '2026-09-26T12:00:00Z' },
  ]
  const C = (n) => `20000000-0000-0000-0000-0000000000${String(n).padStart(2, '0')}`
  const caftans = [
    { id: C(1), slug: 'caftan-andalou-rouge', category_id: categories[0].id, name: { ar: 'قفطان أندلسي أحمر', fr: 'Caftan Andalou Rouge', en: 'Red Andalusian Caftan' }, description: { ar: 'قفطان أندلسي بتطريز يدوي فاخر وخيوط ذهبية.', fr: 'Caftan andalou avec broderie main raffinée et fils dorés.', en: 'Andalusian caftan with refined hand embroidery and golden threads.' }, size: 'M', color: 'Rouge', price_per_day: 800, deposit_amount: 2000, status: 'available', featured: true, created_at: '2026-09-26T12:00:00Z', updated_at: '2026-09-26T12:00:00Z' },
    { id: C(2), slug: 'takchita-royale-doree', category_id: categories[1].id, name: { ar: 'تكشيطة ملكية ذهبية', fr: 'Takchita Royale Dorée', en: 'Golden Royal Takchita' }, description: { ar: 'تكشيطة فاخرة من قطعتين بقماش المخمل والتطريز الذهبي.', fr: 'Takchita deux pièces luxueuse en velours avec broderie dorée.', en: 'Luxurious two-piece velvet takchita with golden embroidery.' }, size: 'S', color: 'Doré', price_per_day: 1200, deposit_amount: 3000, status: 'available', featured: true, created_at: '2026-09-26T12:00:00Z', updated_at: '2026-09-26T12:00:00Z' },
    { id: C(3), slug: 'caftan-bleu-roi', category_id: categories[0].id, name: { ar: 'قفطان أزرق ملكي', fr: 'Caftan Bleu Roi', en: 'Royal Blue Caftan' }, description: { ar: 'قفطان أزرق ملكي بأزرار العقيق وحزام مطرز.', fr: 'Caftan bleu roi avec boutons en pierres fines et ceinture brodée.', en: 'Royal blue caftan with gemstone buttons and embroidered belt.' }, size: 'L', color: 'Bleu roi', price_per_day: 700, deposit_amount: 1800, status: 'available', featured: false, created_at: '2026-09-26T12:00:00Z', updated_at: '2026-09-26T12:00:00Z' },
    { id: C(4), slug: 'jellaba-ivoire-brodee', category_id: categories[2].id, name: { ar: 'جلابة عاجية مطرزة', fr: 'Jellaba Ivoire Brodée', en: 'Embroidered Ivory Jellaba' }, description: { ar: 'جلابة عاجية خفيفة بتطريز دقيق عند الصدر والأكمام.', fr: 'Jellaba ivoire légère avec broderie fine au buste et aux manches.', en: 'Light ivory jellaba with fine embroidery on chest and sleeves.' }, size: 'Taille unique', color: 'Ivoire', price_per_day: 400, deposit_amount: 1000, status: 'available', featured: false, created_at: '2026-09-26T12:00:00Z', updated_at: '2026-09-26T12:00:00Z' },
    { id: C(5), slug: 'takchita-vert-emeraude', category_id: categories[1].id, name: { ar: 'تكشيطة خضراء زمردية', fr: 'Takchita Vert Émeraude', en: 'Emerald Green Takchita' }, description: { ar: 'تكشيطة زمردية بحرير طبيعي وتفاصيل فضية.', fr: 'Takchita émeraude en soie naturelle et détails argentés.', en: 'Emerald takchita in natural silk with silver details.' }, size: 'M', color: 'Vert émeraude', price_per_day: 1100, deposit_amount: 2500, status: 'available', featured: true, created_at: '2026-09-26T12:00:00Z', updated_at: '2026-09-26T12:00:00Z' },
    { id: C(6), slug: 'caftan-rose-poudre', category_id: categories[0].id, name: { ar: 'قفطان وردي بودري', fr: 'Caftan Rose Poudré', en: 'Powder Pink Caftan' }, description: { ar: 'قفطان وردي ناعم مثالي للخطوبة والمناسبات النهارية.', fr: 'Caftan rose poudré doux, idéal pour fiançailles et réceptions de jour.', en: 'Soft powder pink caftan, ideal for engagements and daytime events.' }, size: 'S', color: 'Rose poudré', price_per_day: 650, deposit_amount: 1500, status: 'available', featured: false, created_at: '2026-09-26T12:00:00Z', updated_at: '2026-09-26T12:00:00Z' },
    { id: C(7), slug: 'caftan-bordeaux-perle', category_id: categories[0].id, name: { ar: 'قفطان عنابي مزين باللؤلؤ', fr: 'Caftan Bordeaux Perlé', en: 'Pearled Burgundy Caftan' }, description: { ar: 'قفطان عنابي فاخر مزين بحبات اللؤلؤ يدوياً.', fr: 'Caftan bordeaux luxueux orné de perles cousues main.', en: 'Luxurious burgundy caftan adorned with hand-sewn pearls.' }, size: 'M', color: 'Bordeaux', price_per_day: 900, deposit_amount: 2200, status: 'available', featured: true, created_at: '2026-09-26T12:00:00Z', updated_at: '2026-09-26T12:00:00Z' },
    { id: C(8), slug: 'takchita-noire-et-or', category_id: categories[1].id, name: { ar: 'تكشيطة سوداء وذهبية', fr: 'Takchita Noire et Or', en: 'Black and Gold Takchita' }, description: { ar: 'تكشيطة سوداء أنيقة بلمسات ذهبية للسهرات.', fr: 'Takchita noire élégante aux touches dorées pour les soirées.', en: 'Elegant black takchita with golden touches for evening events.' }, size: 'L', color: 'Noir et or', price_per_day: 1000, deposit_amount: 2500, status: 'available', featured: false, created_at: '2026-09-26T12:00:00Z', updated_at: '2026-09-26T12:00:00Z' },
    { id: C(9), slug: 'caftan-blanc-mariee', category_id: categories[0].id, name: { ar: 'قفطان أبيض للعروس', fr: 'Caftan Blanc Mariée', en: 'Bridal White Caftan' }, description: { ar: 'قفطان أبيض فاخر مخصص للعرائس، قيد الصيانة حالياً.', fr: 'Caftan blanc haute couture dédié aux mariées, actuellement en entretien.', en: 'Haute couture white bridal caftan, currently under maintenance.' }, size: 'M', color: 'Blanc', price_per_day: 1800, deposit_amount: 4000, status: 'maintenance', featured: false, created_at: '2026-09-26T12:00:00Z', updated_at: '2026-09-26T12:00:00Z' },
    { id: C(10), slug: 'jellaba-saumon', category_id: categories[2].id, name: { ar: 'جلابة سالمونية', fr: 'Jellaba Saumon', en: 'Salmon Jellaba' }, description: { ar: 'جلابة سالمونية كلاسيكية، خارجة من الكتالوج.', fr: 'Jellaba saumon classique, retirée du catalogue.', en: 'Classic salmon jellaba, retired from the catalogue.' }, size: 'Taille unique', color: 'Saumon', price_per_day: 350, deposit_amount: 800, status: 'retired', featured: false, created_at: '2026-09-26T12:00:00Z', updated_at: '2026-09-26T12:00:00Z' },
  ]
  const images = []
  let imgSeq = 0
  for (const c of caftans) {
    images.push({ id: `30000000-0000-0000-0000-${String(++imgSeq).padStart(12, '0')}`, caftan_id: c.id, storage_path: `seed/${c.slug}-1.jpg`, alt_text: { ar: c.name.ar, fr: c.name.fr, en: c.name.en }, sort_order: 1, is_primary: true, created_at: '2026-09-26T12:00:00Z' })
  }
  images.push({ id: `30000000-0000-0000-0000-${String(++imgSeq).padStart(12, '0')}`, caftan_id: C(1), storage_path: 'seed/caftan-andalou-rouge-2.jpg', alt_text: { ar: 'قفطان أندلسي أحمر - تفاصيل التطريز', fr: 'Caftan Andalou Rouge — détail de la broderie', en: 'Red Andalusian Caftan — embroidery detail' }, sort_order: 2, is_primary: false, created_at: '2026-09-26T12:00:00Z' })

  const adminId = '40000000-0000-0000-0000-000000000001'
  const users = [{
    id: adminId, email: 'admin@zomoroda.ma', password: 'AdminPass123!',
    user_metadata: { full_name: 'Admin Zomoroda', phone: null },
    created_at: '2026-09-26T12:00:00Z',
  }]
  const profiles = [{
    id: adminId, full_name: 'Admin Zomoroda', phone: null, whatsapp_number: null,
    city: null, role: 'admin', created_at: '2026-09-26T12:00:00Z', updated_at: '2026-09-26T12:00:00Z',
  }]

  return {
    users, profiles, categories, caftans, images,
    bookings: [], history: [], adminNotes: {},
    settings: [{
      id: 1, whatsapp_number: '+212600000000', phone: '+212500000000',
      email: 'contact@example.com', address: { fr: 'Casablanca, Maroc', ar: 'الدار البيضاء، المغرب', en: 'Casablanca, Morocco' },
      social_links: {}, seo_defaults: {}, created_at: '2026-09-26T12:00:00Z', updated_at: '2026-09-26T12:00:00Z',
    }],
    tokens: new Map(), // access_token -> user id
    seq: 0,            // booking number sequence
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const json = (res, status, body, headers = {}) => {
  const payload = body === undefined ? '' : JSON.stringify(body)
  res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', ...headers })
  res.end(payload)
}
const pgError = (res, code, message, status = 400) =>
  json(res, status, { code, message, details: null, hint: null })

function sessionFor(db, user) {
  const access = `mock-at-${randomUUID()}`
  db.tokens.set(access, user.id)
  return {
    access_token: access,
    refresh_token: `mock-rt-${randomUUID()}`,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: authUser(user),
  }
}
const authUser = (u) => ({
  id: u.id, email: u.email, aud: 'authenticated', role: 'authenticated',
  user_metadata: u.user_metadata, created_at: u.created_at,
  app_metadata: { provider: 'email' },
})
const caller = (db, req) => {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')
  if (!m) return null
  const id = db.tokens.get(m[1])
  return db.users.find((u) => u.id === id) ?? null
}
const callerProfile = (db, req) => {
  const u = caller(db, req)
  return u ? db.profiles.find((p) => p.id === u.id) ?? null : null
}
const isAdmin = (db, req) => callerProfile(db, req)?.role === 'admin'

const daysBetween = (a, b) =>
  Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000) + 1

// Minimal PostgREST filter emulation: supports eq / neq / in on top-level
// scalar columns, order=col(.desc), and object accept for single/maybeSingle.
function applyQuery(rows, url) {
  let out = [...rows]
  for (const [key, raw] of url.searchParams) {
    if (key === 'select' || key === 'order' || key === 'limit' || key === 'offset') continue
    const [op, ...rest] = raw.split('.')
    const val = rest.join('.')
    if (op === 'eq') out = out.filter((r) => String(r[key]) === val)
    else if (op === 'neq') out = out.filter((r) => String(r[key]) !== val)
    else if (op === 'in') {
      const vals = val.replace(/^\(|\)$/g, '').split(',')
      out = out.filter((r) => vals.includes(String(r[key])))
    }
  }
  const order = url.searchParams.get('order')
  if (order) {
    for (const term of order.split(',')) {
      const [col, dir] = term.split('.')
      out.sort((a, b) => {
        const av = a[col], bv = b[col]
        const cmp = typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av ?? '').localeCompare(String(bv ?? ''))
        return dir === 'desc' ? -cmp : cmp
      })
    }
  }
  return out
}

function embed(db, table, row, select) {
  // Emulates the two embed shapes the app uses:
  //   caftans:  *, category:categories(*), images:caftan_images(*)
  //   bookings: *, caftan:caftans(*, category:categories(*), images:caftan_images(*))
  const out = { ...row }
  if (!select) return out
  if (table === 'caftans' && select.includes('category:categories')) {
    out.category = db.categories.find((c) => c.id === row.category_id) ?? null
  }
  if (table === 'caftans' && select.includes('images:caftan_images')) {
    out.images = db.images
      .filter((i) => i.caftan_id === row.id)
      .sort((a, b) => a.sort_order - b.sort_order)
  }
  if (table === 'bookings' && select.includes('caftan:caftans')) {
    const c = db.caftans.find((x) => x.id === row.caftan_id)
    out.caftan = c ? embed(db, 'caftans', c, '*,category:categories(*),images:caftan_images(*)') : null
  }
  return out
}

function restList(db, req, res, url, table, rows) {
  const select = url.searchParams.get('select') ?? '*'
  const filtered = applyQuery(rows, url).map((r) => embed(db, table, r, select))
  const wantsObject = (req.headers.accept ?? '').includes('vnd.pgrst.object+json')
  if (wantsObject) {
    if (filtered.length === 0) {
      return json(res, 406, { code: 'PGRST116', message: 'The result contains 0 rows', details: null, hint: null })
    }
    return json(res, 200, filtered[0])
  }
  return json(res, 200, filtered)
}

// ---------------------------------------------------------------------------
// Table handlers (RLS-emulated)
// ---------------------------------------------------------------------------
function handleTable(db, req, res, url, table, body) {
  const me = caller(db, req)
  const meProfile = me ? db.profiles.find((p) => p.id === me.id) : null

  if (table === 'site_settings') return restList(db, req, res, url, table, db.settings)
  if (table === 'categories') return restList(db, req, res, url, table, db.categories)
  if (table === 'caftan_images') return restList(db, req, res, url, table, db.images)

  if (table === 'caftans') {
    if (req.method === 'GET') return restList(db, req, res, url, table, db.caftans)
    return pgError(res, '42501', 'Insufficient privileges', 403)
  }

  if (table === 'profiles') {
    if (!me) return pgError(res, '42501', 'JWT required', 401)
    const visible = meProfile?.role === 'admin' ? db.profiles : db.profiles.filter((p) => p.id === me.id)
    if (req.method === 'GET') return restList(db, req, res, url, table, visible)
    if (req.method === 'PATCH') {
      // RLS: users update only their own row, and never the role column.
      const idEq = url.searchParams.get('id')
      const targetId = idEq?.startsWith('eq.') ? idEq.slice(3) : null
      if (targetId !== me.id) return pgError(res, '42501', 'Insufficient privileges', 403)
      const p = db.profiles.find((x) => x.id === me.id)
      const { role, ...safe } = body ?? {}
      Object.assign(p, safe, { updated_at: new Date().toISOString() })
      return json(res, 200, [p])
    }
    return pgError(res, '42501', 'Insufficient privileges', 403)
  }

  if (table === 'bookings') {
    if (!me) return pgError(res, '42501', 'JWT required', 401)
    if (req.method === 'GET') {
      const visible = meProfile?.role === 'admin'
        ? db.bookings
        : db.bookings.filter((b) => b.customer_id === me.id)
      return restList(db, req, res, url, table, visible)
    }
    if (req.method === 'POST') {
      const { caftan_id, customer_id, start_date, end_date, customer_notes } = body ?? {}
      // RLS WITH CHECK: customer_id must be the caller.
      if (customer_id !== me.id) return pgError(res, '42501', 'new row violates row-level security policy for table "bookings"', 403)
      const caftan = db.caftans.find((c) => c.id === caftan_id)
      if (!caftan || caftan.status !== 'available') {
        return pgError(res, '42501', 'new row violates row-level security policy for table "bookings"', 403)
      }
      // Exclusion constraint: no overlap on the same caftan for
      // pending/confirmed bookings (daterange '[]' semantics).
      const overlap = db.bookings.some((b) =>
        b.caftan_id === caftan_id &&
        (b.status === 'pending' || b.status === 'confirmed') &&
        b.start_date <= end_date && b.end_date >= start_date)
      if (overlap) {
        return pgError(res, '23P01', 'conflicting key value violates exclusion constraint "bookings_no_overlap"', 409)
      }
      db.seq += 1
      const now = new Date().toISOString()
      const booking = {
        id: randomUUID(),
        booking_number: `CF-${new Date().getFullYear()}-${String(db.seq).padStart(4, '0')}`,
        customer_id, caftan_id, start_date, end_date,
        status: 'pending',
        total_price: daysBetween(start_date, end_date) * Number(caftan.price_per_day),
        deposit_status: 'unpaid',
        customer_notes: customer_notes ?? '',
        admin_notes: '',
        created_at: now, updated_at: now,
        rental_period: `[${start_date},${end_date}]`,
      }
      db.bookings.push(booking)
      db.history.push({
        id: randomUUID(), booking_id: booking.id, from_status: null,
        to_status: 'pending', changed_by: me.id, note: '', created_at: now,
      })
      const wantsObject = (req.headers.accept ?? '').includes('vnd.pgrst.object+json')
      return json(res, 201, wantsObject ? booking : [booking])
    }
    if (req.method === 'PATCH') {
      // Customer cancel: own booking, only from 'pending'.
      const idEq = url.searchParams.get('id')
      const targetId = idEq?.startsWith('eq.') ? idEq.slice(3) : null
      const b = db.bookings.find((x) => x.id === targetId)
      if (!b || b.customer_id !== me.id) return pgError(res, '42501', 'Insufficient privileges', 403)
      const statusEq = url.searchParams.get('status')
      if (statusEq === 'eq.pending' && b.status !== 'pending') {
        // 0 rows matched the update — PostgREST returns an empty array;
        // .single() then surfaces PGRST116.
        return json(res, 200, [])
      }
      if (body?.status && body.status !== b.status) {
        db.history.push({
          id: randomUUID(), booking_id: b.id, from_status: b.status,
          to_status: body.status, changed_by: me.id, note: '', created_at: new Date().toISOString(),
        })
        b.status = body.status
        b.updated_at = new Date().toISOString()
      }
      const wantsObject = (req.headers.accept ?? '').includes('vnd.pgrst.object+json')
      return json(res, 200, wantsObject ? b : [b])
    }
    return pgError(res, '42501', 'Insufficient privileges', 403)
  }

  if (table === 'booking_status_history') {
    if (!me) return pgError(res, '42501', 'JWT required', 401)
    const visible = meProfile?.role === 'admin'
      ? db.history
      : db.history.filter((h) => {
          const b = db.bookings.find((x) => x.id === h.booking_id)
          return b?.customer_id === me.id
        })
    return restList(db, req, res, url, table, visible)
  }

  return pgError(res, 'PGRST205', `table ${table} not found`, 404)
}

// ---------------------------------------------------------------------------
// Admin RPCs (security definer + is_admin() guard)
// ---------------------------------------------------------------------------
function handleRpc(db, req, res, name, body) {
  const guard = () => {
    if (!caller(db, req)) { pgError(res, '42501', 'JWT required', 401); return false }
    if (!isAdmin(db, req)) { pgError(res, '42501', 'Insufficient privileges'); return false }
    return true
  }
  const withCustomerCaftan = (b) => {
    const p = db.profiles.find((x) => x.id === b.customer_id)
    const c = db.caftans.find((x) => x.id === b.caftan_id)
    return {
      ...b,
      customer: p ? { id: p.id, full_name: p.full_name, phone: p.phone, whatsapp_number: p.whatsapp_number, city: p.city } : null,
      caftan: c ? { id: c.id, slug: c.slug, name: c.name } : null,
    }
  }

  switch (name) {
    case 'admin_dashboard_kpis': {
      if (!guard()) return
      const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0)
      const counts = new Map()
      for (const b of db.bookings) counts.set(b.caftan_id, (counts.get(b.caftan_id) ?? 0) + 1)
      const top = [...counts.entries()]
        .map(([cid, n]) => {
          const c = db.caftans.find((x) => x.id === cid)
          return { caftan_id: cid, slug: c?.slug, name: c?.name, booking_count: n }
        })
        .sort((a, b) => b.booking_count - a.booking_count || String(a.slug).localeCompare(String(b.slug)))
        .slice(0, 5)
      return json(res, 200, {
        bookings_this_month: db.bookings.filter((b) => b.created_at >= monthStart.toISOString()).length,
        pending_count: db.bookings.filter((b) => b.status === 'pending').length,
        revenue_estimate: db.bookings.filter((b) => b.status === 'confirmed' || b.status === 'completed')
          .reduce((s, b) => s + Number(b.total_price), 0),
        revenue_statuses: ['confirmed', 'completed'],
        top_caftans: top,
        generated_at: new Date().toISOString(),
      })
    }
    case 'admin_recent_activity': {
      if (!guard()) return
      const limit = body?.p_limit ?? 10
      const events = db.history.map((h) => {
        const b = db.bookings.find((x) => x.id === h.booking_id)
        const p = b && db.profiles.find((x) => x.id === b.customer_id)
        return {
          type: h.from_status === null ? 'booking_created' : 'status_change',
          booking_number: b?.booking_number ?? null,
          customer_name: p?.full_name ?? null,
          from_status: h.from_status, to_status: h.to_status,
          occurred_at: h.created_at,
        }
      })
      for (const p of db.profiles.filter((x) => x.role === 'customer')) {
        events.push({ type: 'customer_registered', booking_number: null, customer_name: p.full_name, from_status: null, to_status: null, occurred_at: p.created_at })
      }
      events.sort((a, b) => String(b.occurred_at).localeCompare(String(a.occurred_at)))
      return json(res, 200, events.slice(0, limit))
    }
    case 'admin_list_bookings': {
      if (!guard()) return
      const rows = db.bookings.map(withCustomerCaftan)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      return json(res, 200, rows)
    }
    case 'admin_get_booking': {
      if (!guard()) return
      const b = db.bookings.find((x) => x.id === body?.p_booking_id)
      if (!b) return pgError(res, 'P0002', 'Booking not found')
      return json(res, 200, {
        booking: b,
        customer: db.profiles.find((x) => x.id === b.customer_id) ?? null,
        caftan: db.caftans.find((x) => x.id === b.caftan_id) ?? null,
        history: db.history.filter((h) => h.booking_id === b.id)
          .sort((a, c) => String(a.created_at).localeCompare(String(c.created_at))),
        admin_notes: db.adminNotes[b.id] ?? '',
      })
    }
    case 'admin_update_booking_status': {
      if (!guard()) return
      const { p_booking_id, p_new_status, p_note } = body ?? {}
      if (p_note != null && String(p_note).length > 500) return pgError(res, '22023', 'Status note too long')
      const b = db.bookings.find((x) => x.id === p_booking_id)
      if (!b) return pgError(res, 'P0002', 'Booking not found')
      const valid = ['pending', 'confirmed', 'rejected', 'completed', 'cancelled']
      if (!valid.includes(p_new_status)) return pgError(res, '22023', `Unknown status ${p_new_status}`)
      if (b.status === p_new_status) return pgError(res, '22023', `Booking is already in status ${p_new_status}`)
      const allowed =
        (b.status === 'pending' && ['confirmed', 'rejected', 'cancelled'].includes(p_new_status)) ||
        (b.status === 'confirmed' && ['completed', 'cancelled'].includes(p_new_status))
      if (!allowed) return pgError(res, '22023', `Invalid status transition from ${b.status} to ${p_new_status}`)
      const from = b.status
      b.status = p_new_status
      b.updated_at = new Date().toISOString()
      db.history.push({
        id: randomUUID(), booking_id: b.id, from_status: from, to_status: p_new_status,
        changed_by: caller(db, req)?.id ?? null,
        note: p_note && String(p_note).trim() !== '' ? String(p_note).trim() : '',
        created_at: new Date().toISOString(),
      })
      return json(res, 200, b)
    }
    case 'admin_set_booking_notes': {
      if (!guard()) return
      const { p_booking_id, p_notes } = body ?? {}
      if (p_notes != null && String(p_notes).length > 2000) return pgError(res, '22023', 'Notes too long')
      if (!db.bookings.some((x) => x.id === p_booking_id)) return pgError(res, 'P0002', 'Booking not found')
      db.adminNotes[p_booking_id] = String(p_notes ?? '').trim()
      return json(res, 200, null)
    }
    case 'admin_list_customers': {
      if (!guard()) return
      const rows = db.profiles.filter((p) => p.role === 'customer').map((p) => {
        const bs = db.bookings.filter((b) => b.customer_id === p.id)
          .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
        return {
          id: p.id, full_name: p.full_name, phone: p.phone,
          whatsapp_number: p.whatsapp_number, city: p.city, created_at: p.created_at,
          booking_count: bs.length,
          last_booking_at: bs[0]?.created_at ?? null,
          last_booking_status: bs[0]?.status ?? null,
        }
      }).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      return json(res, 200, rows)
    }
    case 'admin_get_customer': {
      if (!guard()) return
      const p = db.profiles.find((x) => x.id === body?.p_customer_id)
      if (!p) return pgError(res, 'P0002', 'Customer not found')
      const bookings = db.bookings.filter((b) => b.customer_id === p.id)
        .map(withCustomerCaftan)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      return json(res, 200, { profile: p, bookings })
    }
    case 'admin_caftan_occupancy': {
      if (!guard()) return
      const { p_from, p_to } = body ?? {}
      const rows = db.bookings
        .filter((b) => ['pending', 'confirmed', 'completed'].includes(b.status) &&
          b.start_date <= p_to && b.end_date >= p_from)
        .map((b) => {
          const c = db.caftans.find((x) => x.id === b.caftan_id)
          const p = db.profiles.find((x) => x.id === b.customer_id)
          return {
            booking_id: b.id, booking_number: b.booking_number, status: b.status,
            start_date: b.start_date, end_date: b.end_date,
            customer_name: p?.full_name ?? null,
            caftan: c ? { id: c.id, slug: c.slug, name: c.name } : null,
          }
        })
        .sort((a, b) => String(a.caftan?.slug).localeCompare(String(b.caftan?.slug)) || a.start_date.localeCompare(b.start_date))
      return json(res, 200, rows)
    }
    default:
      return pgError(res, 'PGRST202', `function ${name} not found`, 404)
  }
}

// ---------------------------------------------------------------------------
// Auth (GoTrue subset)
// ---------------------------------------------------------------------------
function handleAuth(db, req, res, url, body) {
  const path = url.pathname.replace(/^\/auth\/v1/, '')
  if (path === '/signup' && req.method === 'POST') {
    const { email, password, data } = body ?? {}
    if (db.users.some((u) => u.email === email)) {
      return json(res, 422, { code: 422, error_code: 'user_already_exists', msg: 'User already registered' })
    }
    const now = new Date().toISOString()
    const user = { id: randomUUID(), email, password, user_metadata: data ?? {}, created_at: now }
    db.users.push(user)
    // handle_new_user trigger emulation
    db.profiles.push({
      id: user.id, full_name: data?.full_name ?? '', phone: data?.phone ?? null,
      whatsapp_number: data?.phone ?? null, city: null, role: 'customer',
      created_at: now, updated_at: now,
    })
    return json(res, 200, sessionFor(db, user))
  }
  if (path === '/token' && req.method === 'POST') {
    const { email, password } = body ?? {}
    const user = db.users.find((u) => u.email === email && u.password === password)
    if (!user) {
      return json(res, 400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' })
    }
    return json(res, 200, sessionFor(db, user))
  }
  if (path === '/user' && req.method === 'GET') {
    const me = caller(db, req)
    if (!me) return json(res, 403, { code: 403, error_code: 'bad_jwt', msg: 'invalid JWT' })
    return json(res, 200, authUser(me))
  }
  if (path === '/user' && req.method === 'PUT') {
    const me = caller(db, req)
    if (!me) return json(res, 403, { code: 403, error_code: 'bad_jwt', msg: 'invalid JWT' })
    if (body?.password) me.password = body.password
    return json(res, 200, authUser(me))
  }
  if (path === '/logout' && req.method === 'POST') {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')
    if (m) db.tokens.delete(m[1])
    return json(res, 204, undefined)
  }
  if (path === '/recover' && req.method === 'POST') {
    return json(res, 200, {})
  }
  return json(res, 404, { code: 404, msg: 'not found' })
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------
export function startMock(port = 0) {
  const db = seed()
  const server = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') return json(res, 200, {})
    const url = new URL(req.url, 'http://mock')
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      let body = null
      if (chunks.length) {
        try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { body = null }
      }
      try {
        if (url.pathname.startsWith('/auth/v1')) return handleAuth(db, req, res, url, body)
        const rest = /^\/rest\/v1\/(.+)$/.exec(url.pathname)
        if (rest) {
          const name = rest[1]
          if (name.startsWith('rpc/')) return handleRpc(db, req, res, name.slice(4), body)
          return handleTable(db, req, res, url, name, body)
        }
        if (url.pathname.startsWith('/storage/v1/object/public/caftan-images/') ||
            url.pathname.startsWith('/storage/v1/render/image/public/caftan-images/')) {
          res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'public, max-age=3600' })
          return res.end(PNG)
        }
        if (url.pathname.startsWith('/storage/v1/object/caftan-images') && req.method === 'POST') {
          return json(res, 200, { Key: `caftan-images/${randomUUID()}` })
        }
        if (url.pathname.startsWith('/storage/v1/object/caftan-images') && req.method === 'DELETE') {
          return json(res, 200, [])
        }
        return json(res, 404, { message: 'not found' })
      } catch (err) {
        return json(res, 500, { message: String(err?.message ?? err) })
      }
    })
  })
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      resolve({ server, db, port: server.address().port, close: () => new Promise((r) => server.close(r)) })
    })
  })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.argv[2] ?? 4174)
  startMock(port).then(({ port: p }) => console.log(`[mock-supabase] listening on http://127.0.0.1:${p}`))
}
