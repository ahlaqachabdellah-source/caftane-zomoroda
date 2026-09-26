import { Routes, Route } from 'react-router'
import { AuthProvider } from '@/components/auth/AuthProvider'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import LocaleLayout from '@/components/i18n/LocaleLayout'
import LocaleRedirect from '@/components/i18n/LocaleRedirect'
import ErrorBoundary from '@/components/states/ErrorBoundary'
import SiteChrome from '@/components/layout/SiteChrome'
import Home from './pages/Home'
import NotFoundPage from './pages/NotFoundPage'
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
import AdminLayout from './pages/admin/AdminLayout'
import AdminOverviewPage from './pages/admin/AdminOverviewPage'
import AdminCaftansPage from './pages/admin/AdminCaftansPage'
import AdminCaftanFormPage from './pages/admin/AdminCaftanFormPage'
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage'
import AdminBookingsPage from './pages/admin/AdminBookingsPage'
import AdminBookingDetailPage from './pages/admin/AdminBookingDetailPage'
import AdminCalendarPage from './pages/admin/AdminCalendarPage'
import AdminCustomersPage from './pages/admin/AdminCustomersPage'
import AdminCustomerDetailPage from './pages/admin/AdminCustomerDetailPage'

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Routes>
        <Route path="/" element={<LocaleRedirect />} />
        <Route path="/:locale" element={<LocaleLayout />}>
          {/* Public site + customer account: branded chrome (header/footer) */}
          <Route element={<SiteChrome />}>
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
              <Route path="*" element={<NotFoundPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* Admin area: own dashboard shell, no public chrome. The guard
              is the UX layer — authorization is enforced server-side by
              RLS and the admin-only dashboard RPCs. */}
          <Route
            path="admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminOverviewPage />} />
            <Route path="caftans" element={<AdminCaftansPage />} />
            <Route path="caftans/new" element={<AdminCaftanFormPage />} />
            <Route path="caftans/:caftanId/edit" element={<AdminCaftanFormPage />} />
            <Route path="categories" element={<AdminCategoriesPage />} />
            <Route path="bookings" element={<AdminBookingsPage />} />
            <Route path="bookings/:bookingId" element={<AdminBookingDetailPage />} />
            <Route path="calendar" element={<AdminCalendarPage />} />
            <Route path="customers" element={<AdminCustomersPage />} />
            <Route path="customers/:customerId" element={<AdminCustomerDetailPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
        <Route path="*" element={<LocaleRedirect />} />
      </Routes>
      </AuthProvider>
    </ErrorBoundary>
  )
}
