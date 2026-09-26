import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { useUpdateProfile } from '@/hooks/useUpdateProfile'
import { profileSchema, type ProfileFormValues } from '@/lib/validation/profile'

/**
 * Profile editing (Phase 7) — full name, phone, WhatsApp number.
 * Changes persist to the profiles table (RLS: own row only) and the
 * shared auth state is refreshed so the whole app sees the new values.
 * Email stays read-only: it is the sign-in identifier.
 */
export default function ProfilePage() {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const { updateProfile, saving } = useUpdateProfile()
  const [savedOk, setSavedOk] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: '', phone: '', whatsappNumber: '' },
  })

  // Prefill once the profile arrives (async after sign-in).
  useEffect(() => {
    if (profile) {
      reset({
        fullName: profile.full_name,
        phone: profile.phone ?? '',
        whatsappNumber: profile.whatsapp_number ?? '',
      })
    }
  }, [profile, reset])

  async function onSubmit(values: ProfileFormValues) {
    setSavedOk(false)
    setErrorKey(null)
    const { errorKey: key } = await updateProfile({
      fullName: values.fullName,
      phone: values.phone ?? '',
      whatsappNumber: values.whatsappNumber ?? '',
    })
    if (key) {
      setErrorKey(key)
      return
    }
    setSavedOk(true)
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Current account info — email is the sign-in identifier, read-only */}
      <section className="rounded-xl border border-border bg-card p-6 sm:p-8">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground rtl:tracking-normal">
          {t('account.profile_section')}
        </h2>
        <dl className="flex flex-col gap-4">
          <div>
            <dt className="text-xs text-muted-foreground">{t('account.email_label')}</dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {user?.email ?? t('account.not_provided')}
            </dd>
            <dd className="mt-1 text-xs text-muted-foreground">
              {t('account.email_readonly_hint')}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t('account.city_label')}</dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {profile?.city || t('account.not_provided')}
            </dd>
          </div>
        </dl>
      </section>

      {/* Edit form */}
      <section className="rounded-xl border border-border bg-card p-6 sm:p-8">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground rtl:tracking-normal">
          {t('account.profile_edit_title')}
        </h2>

        {savedOk && (
          <p
            role="status"
            className="mb-4 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-3 text-sm text-accent-foreground"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {t('account.profile_saved')}
          </p>
        )}
        {errorKey && (
          <p role="alert" className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {t(errorKey)}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
          <div className="space-y-2">
            <Label htmlFor="fullName">{t('account.name_label')}</Label>
            <Input id="fullName" aria-invalid={Boolean(errors.fullName)} {...register('fullName')} />
            {errors.fullName && (
              <p className="text-sm text-destructive">{t(errors.fullName.message ?? '')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t('auth.phone')}</Label>
            <Input
              id="phone"
              type="tel"
              dir="ltr"
              aria-invalid={Boolean(errors.phone)}
              {...register('phone')}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{t(errors.phone.message ?? '')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsappNumber">{t('account.whatsapp_label')}</Label>
            <Input
              id="whatsappNumber"
              type="tel"
              dir="ltr"
              aria-invalid={Boolean(errors.whatsappNumber)}
              {...register('whatsappNumber')}
            />
            {errors.whatsappNumber && (
              <p className="text-sm text-destructive">{t(errors.whatsappNumber.message ?? '')}</p>
            )}
          </div>
          <Button type="submit" disabled={saving} className="w-full sm:w-auto">
            {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
            {saving ? t('account.saving') : t('account.save')}
          </Button>
        </form>
      </section>
    </div>
  )
}
