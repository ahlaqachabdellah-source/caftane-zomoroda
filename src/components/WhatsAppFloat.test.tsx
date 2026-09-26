import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import WhatsAppFloat from './WhatsAppFloat'

const mockUseSiteSettings = vi.fn()
vi.mock('@/hooks/useSiteSettings', () => ({ useSiteSettings: () => mockUseSiteSettings() }))

function withNumber(whatsappNumber: string | null) {
  mockUseSiteSettings.mockReturnValue({
    settings: whatsappNumber === null ? null : { whatsapp_number: whatsappNumber },
    loading: false,
    error: null,
  })
}

describe('WhatsAppFloat', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(() => i18n.changeLanguage('fr'))
  })

  it('renders an accessible link with a localized prefilled message', () => {
    withNumber('+212 612 345 678')
    render(<WhatsAppFloat />)
    const link = screen.getByRole('link', { name: 'Discuter avec Caftan Zomoroda sur WhatsApp' })
    const href = link.getAttribute('href') ?? ''
    expect(href).toContain('https://wa.me/212612345678?text=')
    expect(href).toContain(encodeURIComponent('j\'aimerais un renseignement'))
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('normalizes a Moroccan local 06 number from site_settings', () => {
    withNumber('0612 345 678')
    render(<WhatsAppFloat />)
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      expect.stringContaining('https://wa.me/212612345678'),
    )
  })

  it('renders nothing when the number is missing or invalid', () => {
    withNumber(null)
    const { unmount, container } = render(<WhatsAppFloat />)
    expect(container).toBeEmptyDOMElement()
    unmount()

    withNumber('')
    const { unmount: u2, container: c2 } = render(<WhatsAppFloat />)
    expect(c2).toBeEmptyDOMElement()
    u2()

    withNumber('12345')
    const { container: c3 } = render(<WhatsAppFloat />)
    expect(c3).toBeEmptyDOMElement()
  })

  it('uses the Arabic message when the locale is Arabic', async () => {
    await act(() => i18n.changeLanguage('ar'))
    withNumber('+212612345678')
    render(<WhatsAppFloat />)
    const href = screen.getByRole('link').getAttribute('href') ?? ''
    expect(href).toContain(encodeURIComponent('أودّ الاستفسار عن كراء القفطان'))
    await act(() => i18n.changeLanguage('fr'))
  })

  it('uses the English message when the locale is English', async () => {
    await act(() => i18n.changeLanguage('en'))
    withNumber('+212612345678')
    render(<WhatsAppFloat />)
    const href = screen.getByRole('link').getAttribute('href') ?? ''
    expect(href).toContain(encodeURIComponent('I would like to ask about caftan rental'))
    await act(() => i18n.changeLanguage('fr'))
  })
})
