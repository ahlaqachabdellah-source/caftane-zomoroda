import { Routes, Route } from 'react-router'
import SiteHeader from '@/components/layout/SiteHeader'
import SiteFooter from '@/components/layout/SiteFooter'
import Home from './pages/Home'

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <div className="flex flex-1 flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </div>
      <SiteFooter />
    </div>
  )
}
