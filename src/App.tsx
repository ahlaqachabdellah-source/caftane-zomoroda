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
import BookingPage from './pages/catalog/BookingPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import AccountLayout from './pages/account/AccountLayout'
import DashboardPage from './pages/account/DashboardPage'
import MyBookingsPage from './pages/account/MyBookingsPage'
import BookingDetailPage from './pages/account/BookingDetailPage'
import ProfilePage from './pages/account/ProfilePage'

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
              <Route
                path="caftans/:slug/book"
                element={
                  <ProtectedRoute>
                    <BookingPage />
                  </ProtectedRoute>
                }
              />
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />
              <Route
                path="account"
                element={
                  <ProtectedRoute>
                    <AccountLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="bookings" element={<MyBookingsPage />} />
                <Route path="bookings/:bookingNumber" element={<BookingDetailPage />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>
            </Route>
            <Route path="*" element={<LocaleRedirect />} />
          </Routes>
        </div>
        <SiteFooter />
      </div>
    </AuthProvider>
  )
}
