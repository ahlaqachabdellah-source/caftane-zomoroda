import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import ErrorBoundary from './ErrorBoundary'

function Bomb(): never {
  throw new Error('SQL trace: relation "bookings" at /srv/internal/db.ts')
}

describe('ErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>tout va bien</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('tout va bien')).toBeInTheDocument()
  })

  it('shows a localized recovery screen without leaking technical details', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Une erreur inattendue est survenue')
    // No stack trace / SQL / internal paths in the UI.
    expect(alert.textContent).not.toMatch(/relation|bookings|\/srv|Error:/)
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: "Retour à l'accueil" })).toHaveAttribute('href', '/')
    // Technical details logged via the dev/monitoring channel only.
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('recovers when the retry button is clicked', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    let shouldThrow = true
    function SometimesBomb() {
      if (shouldThrow) throw new Error('boom')
      return <p>rétabli</p>
    }
    render(
      <ErrorBoundary>
        <SometimesBomb />
      </ErrorBoundary>,
    )
    shouldThrow = false
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(await screen.findByText('rétabli')).toBeInTheDocument()
    consoleSpy.mockRestore()
  })
})

describe('NotFoundPage', () => {
  it('renders the localized 404 with recovery actions', async () => {
    const { default: NotFoundPage } = await import('@/pages/NotFoundPage')
    render(
      <MemoryRouter initialEntries={['/fr/n-importe-quoi']}>
        <NotFoundPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retour' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: "Retour à l'accueil" })).toHaveAttribute('href', '/fr')
  })
})
