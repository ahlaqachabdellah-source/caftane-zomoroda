import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router'
import { AuthProvider } from '@/components/auth/AuthProvider'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import LocaleLayout from '@/components/i18n/LocaleLayout'
import LocaleRedirect from '@/components/i18n/LocaleRedirect'
import ErrorBoundary from '@/components/states/ErrorBoundary'
import LoadingState from '@/components/states/LoadingState'
import SiteChrome from '@/components/layout/SiteChrome'
import Home from './pages/Home'
import NotFoundPage from './pages/NotFoundPage'

/**
 * Route-level code splitting (Phase 14): every non-home page loads on
 * demand. Admin and account bundles — the heaviest screens — are never
 * downloaded by public visitors; Vite emits them as separate chunks.
 * Home stays eager: it is the landing/LCP route.
 */
const CatalogPage = lazy(() => import('./pages/catalog/CatalogPage'))
const CaftanDetailPage = lazy(() => import('./pages/catalog/CaftanDetailPage'))
const BookingPage = lazy(() => import('./pages/catalog/BookingPage'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'))
const AccountLayout = lazy(() => import('./pages/account/AccountLayout'))
const DashboardPage = lazy(() => import('./pages/account/DashboardPage'))
const MyBookingsPage = lazy(() => import('./pages/account/MyBookingsPage'))
const BookingDetailPage = lazy(() => import('./pages/account/BookingDetailPage'))
const ProfilePage = lazy(() => import('./pages/account/ProfilePage'))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const AdminOverviewPage = lazy(() => import('./pages/admin/AdminOverviewPage'))
const AdminCaftansPage = lazy(() => import('./pages/admin/AdminCaftansPage'))
const AdminCaftanFormPage = lazy(() => import('./pages/admin/AdminCaftanFormPage'))
const AdminCategoriesPage = lazy(() => import('./pages/admin/AdminCategoriesPage'))
const AdminBookingsPage = lazy(() => import('./pages/admin/AdminBookingsPage'))
const AdminBookingDetailPage = lazy(() => import('./pages/admin/AdminBookingDetailPage'))
const AdminCalendarPage = lazy(() => import('./pages/admin/AdminCalendarPage'))
const AdminCustomersPage = lazy(() => import('./pages/admin/AdminCustomersPage'))
const AdminCustomerDetailPage = lazy(() => import('./pages/admin/AdminCustomerDetailPage'))

/** Full-height fallback so lazy route transitions do not shift layout. */
function RouteFallback() {
  return <LoadingState className="min-h-[60vh] flex-1" />
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Suspense fallback={<RouteFallback />}>
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
        </Suspense>
      </AuthProvider>
    </ErrorBoundary>
  )
}
