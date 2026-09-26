import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LoginPage from './LoginPage'

const mockUseAuth = vi.fn()
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }))

const signIn = vi.fn()

function setup(signInImpl?: typeof signIn) {
  mockUseAuth.mockReturnValue({
    session: null,
    user: null,
    profile: null,
    role: null,
    isAdmin: false,
    loading: false,
    configured: true,
    signIn: signInImpl ?? signIn,
    signUp: vi.fn(),
    sendPasswordReset: vi.fn(),
    updatePassword: vi.fn(),
    signOut: vi.fn(),
  })
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/account" element={<div>MON COMPTE</div>} />
        <Route path="/register" element={<div>INSCRIPTION</div>} />
        <Route path="/forgot-password" element={<div>MOT DE PASSE OUBLIÉ</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signIn.mockResolvedValue({ error: null, session: { user: { id: 'u1' } } })
  })

  it('renders email and password fields', () => {
    setup()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument()
  })

  it('shows validation errors and never calls signIn on an empty submit', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: /se connecter/i }))
    expect(await screen.findByText('Adresse email invalide')).toBeInTheDocument()
    expect(screen.getByText('Mot de passe requis')).toBeInTheDocument()
    expect(signIn).not.toHaveBeenCalled()
  })

  it('rejects a malformed email without calling signIn', async () => {
    setup()
    await userEvent.type(screen.getByLabelText('Email'), 'pas-un-email')
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /se connecter/i }))
    expect(await screen.findByText('Adresse email invalide')).toBeInTheDocument()
    expect(signIn).not.toHaveBeenCalled()
  })

  it('calls signIn and navigates to the account page on valid credentials', async () => {
    setup()
    await userEvent.type(screen.getByLabelText('Email'), 'cliente@example.com')
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'motdepasse8')
    await userEvent.click(screen.getByRole('button', { name: /se connecter/i }))
    expect(signIn).toHaveBeenCalledWith('cliente@example.com', 'motdepasse8')
    expect(await screen.findByText('MON COMPTE')).toBeInTheDocument()
  })

  it('displays the server error returned by signIn', async () => {
    signIn.mockResolvedValueOnce({ error: 'Email ou mot de passe incorrect.' })
    setup()
    await userEvent.type(screen.getByLabelText('Email'), 'cliente@example.com')
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'mauvais-mot-de-passe')
    await userEvent.click(screen.getByRole('button', { name: /se connecter/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Email ou mot de passe incorrect.',
    )
  })
})
