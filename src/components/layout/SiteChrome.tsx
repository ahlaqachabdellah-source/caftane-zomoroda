import { Outlet } from 'react-router'
import SiteHeader from './SiteHeader'
import SiteFooter from './SiteFooter'
import WhatsAppFloat from '@/components/WhatsAppFloat'

/**
 * Public site chrome (extracted from App.tsx in Phase 9): header, footer
 * and the floating WhatsApp button wrap every public/customer page.
 * The admin area intentionally renders WITHOUT this chrome — it has its
 * own dashboard shell.
 */
export default function SiteChrome() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <div className="flex flex-1 flex-col">
        <Outlet />
      </div>
      <SiteFooter />
      <WhatsAppFloat />
    </div>
  )
}
