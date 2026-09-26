import { Routes, Route } from 'react-router'
import { AuthProvider } from '@/components/auth/AuthProvider'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import LocaleLayout from '@/components/i18n/LocaleLayout'
import LocaleRedirect from '@/components/i18n/LocaleRedirect'
import SiteHeader from '@/components/layout/SiteHeader'
import SiteFooter from '@/components/layout/SiteFooter'
import Home from './pages/Home'
import CatalogPage from './pages/catalog/CatalogPage'
import CaftanDetailPage from './pages/catalog/CaftanDetailPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import AccountOverviewPage from './pages/account/AccountOverviewPage'

export default function App() {
  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <Routes>
            <Route path="/" element={<LocaleRedirect />} />
            <Route path="/:locale" element={<LocaleLayout />}>
              <Route index element={<Home />} />
              <Route path="caftans" element={<CatalogPage />} />
              <Route path="caftans/:slug" element={<CaftanDetailPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />
              <Route
                path="account"
                element={
                  <ProtectedRoute>
                    <AccountOverviewPage />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="*" element={<LocaleRedirect />} />
          </Routes>
        </div>
        <SiteFooter />
      </div>
    </AuthProvider>
  )
}
