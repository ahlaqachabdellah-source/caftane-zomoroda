import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Loader2, MailCheck } from 'lucide-react'
import AuthLayout from '@/components/auth/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/hooks/useLocale'
import { registerSchema, type RegisterFormValues } from '@/lib/validation/auth'

export default function RegisterPage() {
  const { signUp, session, loading, configured } = useAuth()
  const { t } = useTranslation()
  const { localePath } = useLocale()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const [pendingEmailConfirmation, setPendingEmailConfirmation] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) })

  if (!loading && session) {
    return <Navigate to={localePath('/account')} replace />
  }

  async function onSubmit(values: RegisterFormValues) {
    setServerError(null)
    const { error, session: newSession } = await signUp({
      email: values.email,
      password: values.password,
      fullName: values.fullName,
      phone: values.phone || undefined,
    })
    if (error) {
      setServerError(error)
      return
    }
    if (newSession) {
      // Email confirmation disabled → the user is signed in immediately.
      navigate(localePath('/account'), { replace: true })
      return
    }
    setPendingEmailConfirmation(values.email)
  }

  if (pendingEmailConfirmation) {
    return (
      <AuthLayout title={t('auth.verify_email_title')}>
        <div className="flex flex-col items-center gap-4 text-center">
          <MailCheck className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t('auth.verify_email_body', { email: pendingEmailConfirmation })}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('auth.already_confirmed')}{' '}
            <Link to={localePath('/login')} className="font-medium text-foreground underline underline-offset-4">
              {t('auth.submit_login')}
            </Link>
          </p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title={t('auth.register_title')} subtitle={t('auth.register_subtitle')}>
      {!configured && (
        <p role="alert" className="mb-4 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          {t('auth.backend_notice')}
        </p>
      )}
      {serverError && (
        <p role="alert" className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">{t('auth.full_name')}</Label>
          <Input
            id="fullName"
            type="text"
            autoComplete="name"
            placeholder={t('auth.full_name_ph')}
            aria-invalid={Boolean(errors.fullName)}
            {...register('fullName')}
          />
          {errors.fullName && (
            <p className="text-sm text-destructive">{t(errors.fullName.message ?? '')}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t('auth.email')}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={t('auth.email_ph')}
            aria-invalid={Boolean(errors.email)}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{t(errors.email.message ?? '')}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">
            {t('auth.phone')} <span className="text-muted-foreground">{t('auth.optional')}</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder={t('auth.phone_ph')}
            aria-invalid={Boolean(errors.phone)}
            {...register('phone')}
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{t(errors.phone.message ?? '')}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t('auth.password')}</Label>
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
          {t('auth.submit_register')}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t('auth.have_account')}{' '}
        <Link to={localePath('/login')} className="font-medium text-foreground underline underline-offset-4">
          {t('auth.submit_login')}
        </Link>
      </p>
    </AuthLayout>
  )
}
