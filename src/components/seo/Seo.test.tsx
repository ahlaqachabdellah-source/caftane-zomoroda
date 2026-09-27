import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { HelmetProvider } from 'react-helmet-async'
import { beforeEach, describe, expect, it } from 'vitest'
import { act } from '@testing-library/react'
import i18n from '@/i18n'
import { siteOrigin } from '@/lib/seo'
import Seo from '@/components/seo/Seo'

function renderSeo(ui: React.ReactElement, route = '/fr/caftans/caftan-royal') {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </HelmetProvider>,
  )
}

function meta(name: string): string | null {
  return document.head.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ?? null
}
function prop(name: string): string | null {
  return document.head.querySelector(`meta[property="${name}"]`)?.getAttribute('content') ?? null
}

describe('Seo', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('fr'))
  })

  it('writes title, description, canonical, hreflang and social cards', () => {
    renderSeo(<Seo title="Caftan Royal | Caftan Zomoroda" description="Une pièce unique." path="/caftans/caftan-royal" />)

    expect(document.title).toBe('Caftan Royal | Caftan Zomoroda')
    expect(meta('description')).toBe('Une pièce unique.')
    expect(meta('robots')).toContain('index')
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      `${siteOrigin()}/fr/caftans/caftan-royal`,
    )
    const alternates = [...document.head.querySelectorAll('link[rel="alternate"]')]
    expect(alternates).toHaveLength(4)
    expect(alternates.map((a) => a.getAttribute('hreflang'))).toEqual(['fr', 'ar', 'en', 'x-default'])
    expect(alternates[1].getAttribute('href')).toBe(`${siteOrigin()}/ar/caftans/caftan-royal`)

    expect(prop('og:title')).toBe('Caftan Royal | Caftan Zomoroda')
    expect(prop('og:type')).toBe('website')
    expect(prop('og:url')).toBe(`${siteOrigin()}/fr/caftans/caftan-royal`)
    expect(prop('og:locale')).toBe('fr_MA')
    expect(meta('twitter:card')).toBe('summary')
  })

  it('uses og locale and type per page', () => {
    renderSeo(<Seo title="t" description="d" type="product" image="https://cdn.example/x.webp" />)
    expect(prop('og:type')).toBe('product')
    expect(prop('og:image')).toBe('https://cdn.example/x.webp')
    expect(meta('twitter:card')).toBe('summary_large_image')
  })

  it('marks private pages noindex, nofollow', () => {
    renderSeo(<Seo title="t" description="d" noindex />, '/fr/login')
    expect(meta('robots')).toBe('noindex, nofollow')
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      `${siteOrigin()}/fr/login`,
    )
  })

  it('emits valid JSON-LD blocks', () => {
    renderSeo(
      <Seo
        title="t"
        description="d"
        jsonLd={[{ '@context': 'https://schema.org', '@type': 'Product', name: 'Caftan Royal' }]}
      />,
    )
    const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')]
    expect(scripts).toHaveLength(1)
    const parsed = JSON.parse(scripts[0].textContent ?? '{}')
    expect(parsed['@type']).toBe('Product')
    expect(parsed.name).toBe('Caftan Royal')
  })
})
