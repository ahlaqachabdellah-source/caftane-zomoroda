import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RegisterPage from './RegisterPage'

const mockUseAuth = vi.fn()
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }))

const signUp = vi.fn()

function setup() {
  mockUseAuth.mockReturnValue({
    session: null,
    user: null,
    profile: null,
    role: null,
    isAdmin: false,
    loading: false,
    configured: true,
    signIn: vi.fn(),
    signUp,
    sendPasswordReset: vi.fn(),
    updatePassword: vi.fn(),
    signOut: vi.fn(),
  })
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/account" element={<div>MON COMPTE</div>} />
        <Route path="/login" element={<div>CONNEXION</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function fillValidForm() {
  await userEvent.type(screen.getByLabelText('Nom complet'), 'Fatima Zahra')
  await userEvent.type(screen.getByLabelText('Email'), 'fatima@example.com')
  await userEvent.type(screen.getByLabelText(/^Mot de passe$/), 'motdepasse8')
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: email confirmation enabled → no session returned
    signUp.mockResolvedValue({ error: null, session: null })
  })

  it('blocks submission when password confirmation does not match', async () => {
    setup()
    await fillValidForm()
    await userEvent.type(screen.getByLabelText('Confirmer le mot de passe'), 'different1')
    await userEvent.click(screen.getByRole('button', { name: /créer mon compte/i }))
    expect(
      await screen.findByText('Les mots de passe ne correspondent pas'),
    ).toBeInTheDocument()
    expect(signUp).not.toHaveBeenCalled()
  })

  it('rejects a password shorter than 8 characters', async () => {
    setup()
    await userEvent.type(screen.getByLabelText('Nom complet'), 'Fatima Zahra')
    await userEvent.type(screen.getByLabelText('Email'), 'fatima@example.com')
    await userEvent.type(screen.getByLabelText(/^Mot de passe$/), 'court')
    await userEvent.type(screen.getByLabelText('Confirmer le mot de passe'), 'court')
    await userEvent.click(screen.getByRole('button', { name: /créer mon compte/i }))
    expect(
      await screen.findByText('Le mot de passe doit contenir au moins 8 caractères'),
    ).toBeInTheDocument()
    expect(signUp).not.toHaveBeenCalled()
  })

  it('signs up with profile metadata and shows the email-confirmation state', async () => {
    setup()
    await fillValidForm()
    await userEvent.type(screen.getByLabelText(/Téléphone/), '+212612345678')
    await userEvent.type(screen.getByLabelText('Confirmer le mot de passe'), 'motdepasse8')
    await userEvent.click(screen.getByRole('button', { name: /créer mon compte/i }))

    expect(signUp).toHaveBeenCalledWith({
      email: 'fatima@example.com',
      password: 'motdepasse8',
      fullName: 'Fatima Zahra',
      phone: '+212612345678',
    })
    expect(await screen.findByText('Vérifiez votre email')).toBeInTheDocument()
    expect(screen.getByText('fatima@example.com')).toBeInTheDocument()
  })

  it('navigates straight to the account when a session is returned immediately', async () => {
    signUp.mockResolvedValueOnce({ error: null, session: { user: { id: 'u9' } } })
    setup()
    await fillValidForm()
    await userEvent.type(screen.getByLabelText('Confirmer le mot de passe'), 'motdepasse8')
    await userEvent.click(screen.getByRole('button', { name: /créer mon compte/i }))
    expect(await screen.findByText('MON COMPTE')).toBeInTheDocument()
  })

  it('displays the server error returned by signUp', async () => {
    signUp.mockResolvedValueOnce({ error: 'Un compte existe déjà avec cet email.' })
    setup()
    await fillValidForm()
    await userEvent.type(screen.getByLabelText('Confirmer le mot de passe'), 'motdepasse8')
    await userEvent.click(screen.getByRole('button', { name: /créer mon compte/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Un compte existe déjà avec cet email.',
    )
  })
})
