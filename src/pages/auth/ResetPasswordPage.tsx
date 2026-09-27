import { useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Loader2 } from 'lucide-react'
import AuthLayout from '@/components/auth/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/hooks/useLocale'
import Seo from '@/components/seo/Seo'
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/lib/validation/auth'

/**
 * Landing page for the password-recovery email link.
 * Supabase opens this page with a recovery session (detected automatically
 * by supabase-js from the URL); without a session the link is invalid or
 * expired and we say so instead of showing a form that would fail.
 */
export default function ResetPasswordPage() {
  const { updatePassword, session, loading, configured } = useAuth()
  const { t } = useTranslation()
  const { localePath } = useLocale()
  const [serverError, setServerError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) })

  async function onSubmit(values: ResetPasswordFormValues) {
    setServerError(null)
    const { error } = await updatePassword(values.password)
    if (error) {
      setServerError(error)
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <AuthLayout title={t('auth.reset_done_title')}>
        <div className="flex flex-col items-center gap-4 text-center">
          <CheckCircle2 className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t('auth.reset_done_body')}
          </p>
          <Button asChild className="w-full">
            <Link to={localePath('/account')}>{t('auth.go_to_account')}</Link>
          </Button>
        </div>
      </AuthLayout>
    )
  }

  if (!loading && !session) {
    return (
      <AuthLayout title={t('auth.reset_invalid_title')}>
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t('auth.reset_invalid_body')}
          </p>
          <Button asChild className="w-full">
            <Link to={localePath('/forgot-password')}>{t('auth.request_new_link')}</Link>
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title={t('auth.reset_title')} subtitle={t('auth.reset_subtitle')}>
      <Seo title={t('seo.password_title')} description={t('seo.home_description')} noindex />
      {!configured && (
        <p
          role="alert"
          className="mb-4 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground"
        >
          {t('auth.backend_notice')}
        </p>
      )}
      {serverError && (
        <p
          role="alert"
          className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {t(serverError)}
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">{t('auth.new_password')}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            {...register('password')}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{t(errors.password.message ?? '')}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t('auth.password_confirm')}</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword)}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">{t(errors.confirmPassword.message ?? '')}</p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting || !configured}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          {t('auth.submit_update_password')}
        </Button>
      </form>
    </AuthLayout>
  )
}
