import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ForgotPasswordPage from './ForgotPasswordPage'
import ResetPasswordPage from './ResetPasswordPage'

const mockUseAuth = vi.fn()
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }))

const sendPasswordReset = vi.fn()
const updatePassword = vi.fn()

function baseAuth() {
  return {
    session: null,
    user: null,
    profile: null,
    role: null,
    isAdmin: false,
    loading: false,
    configured: true,
    signIn: vi.fn(),
    signUp: vi.fn(),
    sendPasswordReset,
    updatePassword,
    signOut: vi.fn(),
  }
}

function setupForgot() {
  mockUseAuth.mockReturnValue(baseAuth())
  return render(
    <MemoryRouter initialEntries={['/fr/forgot-password']}>
      <Routes>
        <Route path="/fr/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/fr/login" element={<div>CONNEXION</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function setupReset() {
  mockUseAuth.mockReturnValue({ ...baseAuth(), session: { user: { id: 'u1' } } })
  return render(
    <MemoryRouter initialEntries={['/fr/reset-password']}>
      <Routes>
        <Route path="/fr/reset-password" element={<ResetPasswordPage />} />
        <Route path="/fr/login" element={<div>CONNEXION</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sendPasswordReset.mockResolvedValue({ error: null })
  })

  it('renders the email field', () => {
    setupForgot()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('blocks an invalid email without calling the backend', async () => {
    setupForgot()
    await userEvent.type(screen.getByLabelText('Email'), 'pas-un-email')
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer le lien' }))
    expect(await screen.findByText('Adresse email invalide')).toBeInTheDocument()
    expect(sendPasswordReset).not.toHaveBeenCalled()
  })

  it('shows the confirmation state after a successful send', async () => {
    setupForgot()
    await userEvent.type(screen.getByLabelText('Email'), 'client@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer le lien' }))
    expect(sendPasswordReset).toHaveBeenCalledWith('client@example.com')
    expect(await screen.findByText(/client@example\.com/)).toBeInTheDocument()
  })

  it('shows a friendly error when the backend fails', async () => {
    sendPasswordReset.mockResolvedValue({ error: 'errors.generic' })
    setupForgot()
    await userEvent.type(screen.getByLabelText('Email'), 'client@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer le lien' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updatePassword.mockResolvedValue({ error: null })
  })

  it('renders the new-password fields', () => {
    setupReset()
    expect(screen.getByLabelText('Nouveau mot de passe')).toBeInTheDocument()
  })

  it('rejects a short password without calling the backend', async () => {
    setupReset()
    const pw = screen.getByLabelText('Nouveau mot de passe')
    await userEvent.type(pw, 'abc')
    await userEvent.type(screen.getByLabelText('Confirmer le mot de passe'), 'abc')
    await userEvent.click(screen.getByRole('button', { name: 'Mettre à jour' }))
    expect(updatePassword).not.toHaveBeenCalled()
    expect(await screen.findByText(/8 caractères/i)).toBeInTheDocument()
  })

  it('rejects mismatched confirmation', async () => {
    setupReset()
    await userEvent.type(screen.getByLabelText('Nouveau mot de passe'), 'MotDePasse1!')
    await userEvent.type(screen.getByLabelText('Confirmer le mot de passe'), 'AutreChose1!')
    await userEvent.click(screen.getByRole('button', { name: 'Mettre à jour' }))
    expect(updatePassword).not.toHaveBeenCalled()
  })

  it('shows the invalid-link state without a recovery session', () => {
    mockUseAuth.mockReturnValue(baseAuth()) // no session
    render(
      <MemoryRouter initialEntries={['/fr/reset-password']}>
        <Routes>
          <Route path="/fr/reset-password" element={<ResetPasswordPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Lien invalide ou expiré')).toBeInTheDocument()
  })

  it('submits a valid new password', async () => {
    setupReset()
    await userEvent.type(screen.getByLabelText('Nouveau mot de passe'), 'MotDePasse1!')
    await userEvent.type(screen.getByLabelText('Confirmer le mot de passe'), 'MotDePasse1!')
    await userEvent.click(screen.getByRole('button', { name: 'Mettre à jour' }))
    expect(updatePassword).toHaveBeenCalledWith('MotDePasse1!')
  })
})
