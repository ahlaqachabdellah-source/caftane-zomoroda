import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  CatalogGridSkeleton,
  CaftanDetailSkeleton,
  DashboardSkeleton,
  ListRowsSkeleton,
} from './skeletons'

describe('skeleton loading states', () => {
  it('CatalogGridSkeleton exposes a polite status with an sr-only label', () => {
    render(<CatalogGridSkeleton label="Chargement du catalogue" />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-busy', 'true')
    expect(status.querySelector('.sr-only')?.textContent).toBe('Chargement du catalogue')
  })

  it('CatalogGridSkeleton renders placeholder cards', () => {
    const { container } = render(<CatalogGridSkeleton />)
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThanOrEqual(6)
  })

  it('CaftanDetailSkeleton renders a two-part placeholder', () => {
    render(<CaftanDetailSkeleton />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('DashboardSkeleton renders KPI and row placeholders', () => {
    render(<DashboardSkeleton />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('ListRowsSkeleton honours the rows prop', () => {
    const { container } = render(<ListRowsSkeleton rows={3} />)
    // each row is a flex container with its own skeletons
    expect(container.querySelectorAll('[role="status"] > div').length).toBe(3)
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThanOrEqual(3)
  })
})
