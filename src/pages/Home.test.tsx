import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import i18n from '@/i18n'
import Home from './Home'

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/fr']}>
      <Home />
    </MemoryRouter>,
  )
}

describe('Home', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('fr'))
  })

  it('renders the hero with real CTAs only', () => {
    renderHome()
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: "L'élégance du caftan, pour vos plus beaux moments",
      }),
    ).toBeInTheDocument()
    // Primary CTA → real /register route, secondary → real catalog route
    expect(screen.getByRole('link', { name: 'Créer un compte' })).toHaveAttribute(
      'href',
      '/fr/register',
    )
    expect(screen.getByRole('link', { name: 'Découvrir la collection' })).toHaveAttribute(
      'href',
      '/fr/caftans',
    )
  })

  it('renders the three rental steps and the anchor target', () => {
    const { container } = renderHome()
    expect(container.querySelector('#how-it-works')).toBeInTheDocument()
    expect(screen.getByText('Choisissez votre caftan')).toBeInTheDocument()
    expect(screen.getByText('Réservez vos dates')).toBeInTheDocument()
    expect(screen.getByText('Brillez le jour J')).toBeInTheDocument()
  })

  it('renders the values band and final CTA', () => {
    renderHome()
    expect(screen.getByText('Pièces authentiques')).toBeInTheDocument()
    expect(screen.getByText('Entretien expert')).toBeInTheDocument()
    expect(screen.getByText('Accompagnement direct')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Prête pour votre prochaine occasion ?' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Créer mon compte' })).toHaveAttribute(
      'href',
      '/fr/register',
    )
  })

  it('renders fully in Arabic with locale-prefixed links', async () => {
    await act(() => i18n.changeLanguage('ar'))
    renderHome()
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'أناقة القفطان المغربي لأجمل لحظاتك',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'إنشاء حساب' })).toHaveAttribute(
      'href',
      '/ar/register',
    )
    await act(() => i18n.changeLanguage('fr'))
  })
})
