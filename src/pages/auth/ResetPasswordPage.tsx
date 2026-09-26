import { useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Loader2 } from 'lucide-react'
import AuthLayout from '@/components/auth/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/lib/validation/auth'

/**
 * Landing page for the password-recovery email link.
 * Supabase opens this page with a recovery session (detected automatically
 * by supabase-js from the URL); without a session the link is invalid or
 * expired and we say so instead of showing a form that would fail.
 */
export default function ResetPasswordPage() {
  const { updatePassword, session, loading, configured } = useAuth()
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
      <AuthLayout title="Mot de passe mis à jour">
        <div className="flex flex-col items-center gap-4 text-center">
          <CheckCircle2 className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Votre mot de passe a été modifié avec succès.
          </p>
          <Button asChild className="w-full">
            <Link to="/account">Aller à mon compte</Link>
          </Button>
        </div>
      </AuthLayout>
    )
  }

  if (!loading && !session) {
    return (
      <AuthLayout title="Lien invalide ou expiré">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Ce lien de réinitialisation n'est plus valide. Demandez un nouveau lien.
          </p>
          <Button asChild className="w-full">
            <Link to="/forgot-password">Demander un nouveau lien</Link>
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Nouveau mot de passe" subtitle="Choisissez un mot de passe sécurisé">
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
          <Label htmlFor="password">Nouveau mot de passe</Label>
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
          Mettre à jour
        </Button>
      </form>
    </AuthLayout>
  )
}
