/**
 * Phase 15 — build-time prerendering of the localized home pages.
 *
 * The app is a React/Vite SPA; this script gives search engines fully
 * rendered static HTML (head meta, hreflang, OG, LocalBusiness JSON-LD
 * and visible content) for the three locale entry points without changing
 * the runtime architecture. Data-driven pages (catalog, caftan detail)
 * set their SEO tags client-side — Google's renderer executes JS — while
 * these snapshots guarantee the brand entry points are crawlable.
 *
 * Usage:  node scripts/prerender.mjs            (builds + previews + writes)
 * Skips gracefully (exit 0) when playwright/chromium is unavailable, so
 * production builds on any host never break.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 4199
const ROUTES = ['fr', 'ar', 'en']

async function main() {
  let chromium
  try {
    ;({ chromium } = await import('playwright'))
  } catch {
    try {
      ;({ chromium } = await import('/home/kimi/.npm-global/lib/node_modules/playwright/index.mjs'))
    } catch {
      console.warn('[prerender] playwright not installed — skipping (build unaffected).')
      return
    }
  }
  if (!existsSync(path.join(root, 'dist', 'index.html'))) {
    console.warn('[prerender] dist/index.html missing — run `vite build` first. Skipping.')
    return
  }

  const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: root,
    stdio: 'ignore',
  })
  try {
    // wait for the preview server
    const deadline = Date.now() + 20000
    for (;;) {
      try {
        const res = await fetch(`http://localhost:${PORT}/fr`)
        if (res.ok) break
      } catch {}
      if (Date.now() > deadline) throw new Error('preview server did not start')
      await new Promise((r) => setTimeout(r, 400))
    }

    const executablePath = existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined
    const browser = await chromium.launch({
      executablePath,
      args: ['--no-sandbox'],
    })
    try {
      for (const locale of ROUTES) {
        const page = await browser.newPage()
        await page.goto(`http://localhost:${PORT}/${locale}`, { waitUntil: 'networkidle' })
        await page.waitForTimeout(2000)
        const html = `<!doctype html>\n${await page.evaluate(() => document.documentElement.outerHTML)}`
        const dir = path.join(root, 'dist', locale)
        mkdirSync(dir, { recursive: true })
        writeFileSync(path.join(dir, 'index.html'), html)
        console.log(
          `[prerender] wrote dist/${locale}/index.html (${(html.length / 1024).toFixed(0)} kB)`,
        )
        await page.close()
      }
    } finally {
      await browser.close()
    }
  } catch (err) {
    console.warn(`[prerender] skipped: ${err.message}`)
  } finally {
    preview.kill()
  }
}

await main()
