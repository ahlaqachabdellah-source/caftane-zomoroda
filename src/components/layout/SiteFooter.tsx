import Logo from '@/components/brand/Logo'

/**
 * Site footer — brand block. Contact details and links are wired to
 * the site_settings table in a later phase.
 */
export default function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-10 sm:px-6">
        <Logo className="h-20 w-auto sm:h-24" />
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Caftan Zomoroda — Location de caftans
        </p>
      </div>
    </footer>
  )
}
