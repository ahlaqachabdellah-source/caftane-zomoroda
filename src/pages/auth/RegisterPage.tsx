import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, MailCheck } from 'lucide-react'
import AuthLayout from '@/components/auth/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { registerSchema, type RegisterFormValues } from '@/lib/validation/auth'

export default function RegisterPage() {
  const { signUp, session, loading, configured } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const [pendingEmailConfirmation, setPendingEmailConfirmation] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) })

  if (!loading && session) {
    return <Navigate to="/account" replace />
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
      navigate('/account', { replace: true })
      return
    }
    setPendingEmailConfirmation(values.email)
  }

  if (pendingEmailConfirmation) {
    return (
      <AuthLayout title="Vérifiez votre email">
        <div className="flex flex-col items-center gap-4 text-center">
          <MailCheck className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Un email de confirmation a été envoyé à{' '}
            <span className="font-medium text-foreground">{pendingEmailConfirmation}</span>.
            Cliquez sur le lien qu'il contient pour activer votre compte.
          </p>
          <p className="text-sm text-muted-foreground">
            Déjà confirmé ?{' '}
            <Link to="/login" className="font-medium text-foreground underline underline-offset-4">
              Se connecter
            </Link>
          </p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Créer un compte" subtitle="Réservez vos caftans en quelques clics">
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
          <Label htmlFor="fullName">Nom complet</Label>
          <Input
            id="fullName"
            type="text"
            autoComplete="name"
            placeholder="Votre nom et prénom"
            aria-invalid={Boolean(errors.fullName)}
            {...register('fullName')}
          />
          {errors.fullName && (
            <p className="text-sm text-destructive">{errors.fullName.message}</p>
          )}
        </div>
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
        <div className="space-y-2">
          <Label htmlFor="phone">
            Téléphone / WhatsApp <span className="text-muted-foreground">(optionnel)</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+212 6 00 00 00 00"
            aria-invalid={Boolean(errors.phone)}
            {...register('phone')}
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            {...register('password')}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword)}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting || !configured}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          Créer mon compte
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Déjà un compte ?{' '}
        <Link to="/login" className="font-medium text-foreground underline underline-offset-4">
          Se connecter
        </Link>
      </p>
    </AuthLayout>
  )
}
