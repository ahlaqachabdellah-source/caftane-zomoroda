import { Helmet } from 'react-helmet-async'
import { useLocale } from '@/hooks/useLocale'
import { stripLocaleFromPath } from '@/lib/locale'
import { absoluteLocaleUrl, localeAlternates, ogLocale, siteOrigin } from '@/lib/seo'
import { useLocation } from 'react-router'

/**
 * Central SEO component (Phase 15). Every page renders exactly one <Seo>
 * with its own localized title + description — never the generic fallback
 * for important public pages.
 *
 * Provides: <title>, meta description, robots, canonical, hreflang
 * alternates (ar/fr/en + x-default), Open Graph and Twitter/X cards, and
 * optional JSON-LD blocks. All URLs are absolute (VITE_SITE_URL or the
 * live origin).
 */
type SeoProps = {
  /** Localized, page-unique title (already translated by the caller). */
  title: string
  /** Localized meta description. */
  description: string
  /** Locale-neutral canonical path, e.g. '/caftans/caftan-royal'. Defaults to current. */
  path?: string
  /** Private/utility pages: noindex, nofollow. */
  noindex?: boolean
  /** Absolute or storage-relative og:image URL (caftan detail passes its photo). */
  image?: string
  /** og:type — 'website' default, 'product' for caftan detail. */
  type?: 'website' | 'product'
  /** JSON-LD objects (Product/Offer, LocalBusiness, …). */
  jsonLd?: Array<Record<string, unknown>>
}

export default function Seo({
  title,
  description,
  path,
  noindex = false,
  image,
  type = 'website',
  jsonLd = [],
}: SeoProps) {
  const { locale } = useLocale()
  const location = useLocation()
  const neutralPath = path ?? stripLocaleFromPath(location.pathname)
  const canonical = absoluteLocaleUrl(neutralPath, locale)
  const ogImage = image
    ? image.startsWith('http')
      ? image
      : `${siteOrigin()}${image}`
    : `${siteOrigin()}/android-chrome-512x512.png`

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta
          name="robots"
          content={noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'}
        />
        <link rel="canonical" href={canonical} />
        {localeAlternates(neutralPath).map((a) => (
          <link key={a.hreflang} rel="alternate" hrefLang={a.hreflang} href={a.href} />
        ))}

        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content={type} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:locale" content={ogLocale(locale)} />
        <meta property="og:site_name" content="Caftan Zomoroda" />

        <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>
      {/* react-helmet-async does not render <script> children — JSON-LD is
          emitted as regular DOM nodes instead (valid in body per schema.org /
          Google structured-data guidelines). */}
      {jsonLd.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
    </>
  )
}
