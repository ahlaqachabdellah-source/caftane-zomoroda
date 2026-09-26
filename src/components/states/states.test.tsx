import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import EmptyState from './EmptyState'
import ErrorState from './ErrorState'
import LoadingState from './LoadingState'

describe('LoadingState', () => {
  it('announces itself with role=status and the localized label', () => {
    render(<LoadingState />)
    expect(screen.getByRole('status')).toHaveTextContent('Chargement')
  })

  it('accepts a custom label', () => {
    render(<LoadingState label="Chargement de la collection" />)
    expect(screen.getByRole('status')).toHaveTextContent('Chargement de la collection')
  })
})

describe('EmptyState', () => {
  it('renders the default title and an optional action', () => {
    render(<EmptyState action={<button>Action</button>} />)
    expect(screen.getByText('Rien à afficher pour le moment')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
  })

  it('renders a custom title and description', () => {
    render(<EmptyState title="Aucun caftan" description="Revenez bientôt" />)
    expect(screen.getByText('Aucun caftan')).toBeInTheDocument()
    expect(screen.getByText('Revenez bientôt')).toBeInTheDocument()
  })
})

describe('ErrorState', () => {
  it('uses role=alert and fires the retry callback', async () => {
    const onRetry = vi.fn()
    render(<ErrorState description="Réseau indisponible" onRetry={onRetry} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Une erreur est survenue')
    expect(screen.getByRole('alert')).toHaveTextContent('Réseau indisponible')
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('hides the retry button when no handler is given', () => {
    render(<ErrorState />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
