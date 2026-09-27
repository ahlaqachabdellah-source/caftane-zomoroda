/**
 * Phase 17 — performance measurement (real numbers, no estimated scores).
 *
 * Lighthouse is not available in this environment, so this script measures
 * directly via the Chrome DevTools Protocol against the production build
 * (dist-e2e = same code as dist, pointed at the mock backend so the full
 * data-loading path is exercised):
 *
 *   - Network throttling: Lighthouse "mobile" profile (1.6 Mbps down /
 *     750 Kbps up / 150 ms RTT) + 4x CPU throttle.
 *   - Metrics: TTFB, FCP, LCP, DOMContentLoaded, load, total transferred
 *     bytes, request count, long tasks (>50 ms).
 *   - Pages: /fr home, /fr/caftans catalog, /ar home (RTL + Arabic fonts).
 *
 * Run: node tests/e2e/perf.mjs   (requires dist-e2e, see "test:e2e" build)
 */
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'
import { startMock } from './mock-supabase.mjs'

const PLAYWRIGHT = '/home/kimi/.npm-global/lib/node_modules/playwright/index.mjs'
const CHROMIUM = '/usr/bin/chromium'
const DIST = path.join(new URL('..', import.meta.url).pathname, '..', 'dist-e2e')
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' }

function serveStatic(dir) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x')
    let file = path.join(dir, decodeURIComponent(url.pathname))
    if (!existsSync(file) || url.pathname === '/') file = path.join(dir, 'index.html')
    try {
      let data = await readFile(file)
      const type = MIME[path.extname(file)] ?? 'application/octet-stream'
      const headers = { 'content-type': type }
      // Real hosts (Netlify/Vercel) compress text assets — emulate gzip so
      // transferred-bytes numbers are representative of production.
      const compressible = /text|javascript|json|svg|manifest/.test(type)
      if (compressible && data.length > 1024 && (req.headers['accept-encoding'] ?? '').includes('gzip')) {
        data = gzipSync(data)
        headers['content-encoding'] = 'gzip'
      }
      res.writeHead(200, headers)
      res.end(data)
    } catch { res.writeHead(404); res.end() }
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () =>
      resolve({ server, port: server.address().port, close: () => new Promise((r) => server.close(r)) }))
  })
}

const { chromium } = await import(PLAYWRIGHT)
const mock = await startMock(4174)
const app = await serveStatic(DIST)
const BASE = `http://127.0.0.1:${app.port}`

const browser = await chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox', '--disable-dev-shm-usage'] })

async function measure(route) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8,
  })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })

  let bytes = 0, requests = 0
  cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength ?? 0; requests += 1 })

  await page.addInitScript(() => {
    window.__lcp = 0
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__lcp = e.startTime
    }).observe({ type: 'largest-contentful-paint', buffered: true })
    window.__longTasks = 0
    new PerformanceObserver((list) => {
      window.__longTasks += list.getEntries().length
    }).observe({ type: 'longtask', buffered: true })
  })

  const t0 = Date.now()
  await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 60000 })
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(500) // let LCP settle

  const m = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0]
    const fcp = performance.getEntriesByType('paint').find((p) => p.name === 'first-contentful-paint')
    return {
      ttfb: nav?.responseStart ?? 0,
      dcl: nav?.domContentLoadedEventEnd ?? 0,
      load: nav?.loadEventEnd ?? 0,
      fcp: fcp?.startTime ?? 0,
      lcp: window.__lcp ?? 0,
      longTasks: window.__longTasks ?? 0,
    }
  })
  await context.close()
  return { route, ...m, kb: Math.round(bytes / 1024), requests, wallMs: Date.now() - t0 }
}

const targets = ['/fr', '/fr/caftans', '/ar']
const runs = []
try {
  for (const route of targets) {
    // two runs per route, keep the median-ish (second run) to warm the static server
    await measure(route)
    runs.push(await measure(route))
  }
} finally {
  await browser.close()
  await mock.close()
  await app.close()
}

console.log('\nPERFORMANCE — throttled (1.6 Mbps / 150 ms RTT / 4x CPU), mobile 390px')
console.log('route           TTFB    FCP    LCP    DCL    load   transfer  reqs  longTasks')
for (const r of runs) {
  console.log(
    `${r.route.padEnd(14)} ${String(Math.round(r.ttfb)).padStart(5)} ${String(Math.round(r.fcp)).padStart(6)} ${String(Math.round(r.lcp)).padStart(6)} ${String(Math.round(r.dcl)).padStart(6)} ${String(Math.round(r.load)).padStart(6)} ${String(r.kb + ' kB').padStart(8)} ${String(r.requests).padStart(5)} ${String(r.longTasks).padStart(8)}`,
  )
}
console.log('\nDone. These are measured values under emulation — not Lighthouse scores.')
