import { useState } from 'react'
import { Link } from 'react-router'
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
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/lib/validation/auth'

export default function ForgotPasswordPage() {
  const { sendPasswordReset, configured } = useAuth()
  const { t } = useTranslation()
  const { localePath } = useLocale()
  const [serverError, setServerError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) })

  async function onSubmit(values: ForgotPasswordFormValues) {
    setServerError(null)
    const { error } = await sendPasswordReset(values.email)
    if (error) {
      setServerError(error)
      return
    }
    setSentTo(values.email)
  }

  if (sentTo) {
    return (
      <AuthLayout title={t('auth.reset_sent_title')}>
        <div className="flex flex-col items-center gap-4 text-center">
          <MailCheck className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t('auth.reset_sent_body', { email: sentTo })}
          </p>
          <Link
            to={localePath('/login')}
            className="text-sm font-medium text-foreground underline underline-offset-4"
          >
            {t('auth.back_to_login')}
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title={t('auth.forgot_title')} subtitle={t('auth.forgot_subtitle')}>
      {!configured && (
        <p role="alert" className="mb-4 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          {t('auth.backend_notice')}
        </p>
      )}
      {serverError && (
        <p role="alert" className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {t(serverError)}
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
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
        <Button type="submit" className="w-full" disabled={isSubmitting || !configured}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          {t('auth.submit_reset_link')}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to={localePath('/login')} className="font-medium text-foreground underline underline-offset-4">
          {t('auth.back_to_login')}
        </Link>
      </p>
    </AuthLayout>
  )
}
