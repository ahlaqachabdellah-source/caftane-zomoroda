import { useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, MailCheck } from 'lucide-react'
import AuthLayout from '@/components/auth/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/lib/validation/auth'

export default function ForgotPasswordPage() {
  const { sendPasswordReset, configured } = useAuth()
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
      <AuthLayout title="Email envoyé">
        <div className="flex flex-col items-center gap-4 text-center">
          <MailCheck className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Si un compte est associé à{' '}
            <span className="font-medium text-foreground">{sentTo}</span>, vous recevrez un
            lien de réinitialisation dans quelques minutes.
          </p>
          <Link
            to="/login"
            className="text-sm font-medium text-foreground underline underline-offset-4"
          >
            Retour à la connexion
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Mot de passe oublié"
      subtitle="Nous vous enverrons un lien de réinitialisation"
    >
      {!configured && (
        <p role="alert" className="mb-4 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          Le backend n'est pas encore configuré (variables Supabase manquantes).
        </p>
      )}
      {serverError && (
        <p role="alert" className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.com"
            aria-invalid={Boolean(errors.email)}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting || !configured}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          Envoyer le lien
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/login" className="font-medium text-foreground underline underline-offset-4">
          ← Retour à la connexion
        </Link>
      </p>
    </AuthLayout>
  )
}
