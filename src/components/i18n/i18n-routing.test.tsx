import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import i18n from '@/i18n'
import LocaleLayout from './LocaleLayout'
import LocaleRedirect from './LocaleRedirect'
import LanguageSwitcher from './LanguageSwitcher'

/** Probe that prints the current location for navigation assertions. */
function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

function renderRoutes(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/" element={<LocaleRedirect />} />
        <Route path="/:locale" element={<LocaleLayout />}>
          <Route index element={<div>PAGE ACCUEIL</div>} />
          <Route path="login" element={<div>PAGE LOGIN</div>} />
        </Route>
        <Route path="*" element={<LocaleRedirect />} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  )
}

describe('LocaleRedirect', () => {
  it('redirects / to the current/default locale home', async () => {
    await i18n.changeLanguage('fr')
    renderRoutes('/')
    expect(await screen.findByText('PAGE ACCUEIL')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/fr')
  })

  it('preserves query string and hash during the redirect', async () => {
    await i18n.changeLanguage('fr')
    render(
      <MemoryRouter initialEntries={['/?code=abc123']}>
        <Routes>
          <Route path="/" element={<LocaleRedirect />} />
          <Route path="/:locale" element={<LocaleLayout />}>
            <Route index element={<LocationProbe />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    await waitFor(() => expect(i18n.language).toBe('fr'))
  })
})

describe('LocaleLayout', () => {
  it('renders French routes and sets lang/dir to ltr', async () => {
    renderRoutes('/fr/login')
    expect(await screen.findByText('PAGE LOGIN')).toBeInTheDocument()
    await waitFor(() => {
      expect(document.documentElement.lang).toBe('fr')
      expect(document.documentElement.dir).toBe('ltr')
    })
  })

  it('switches to full RTL for Arabic routes', async () => {
    renderRoutes('/ar/login')
    expect(await screen.findByText('PAGE LOGIN')).toBeInTheDocument()
    await waitFor(() => {
      expect(document.documentElement.dir).toBe('rtl')
      expect(document.documentElement.lang).toBe('ar')
      expect(i18n.language).toBe('ar')
    })
  })

  it('redirects unsupported locale prefixes to the default locale', async () => {
    renderRoutes('/de/login')
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/fr/login')
    })
  })

  it('switches i18next language when the URL locale changes', async () => {
    renderRoutes('/en/login')
    await waitFor(() => expect(i18n.language).toBe('en'))
    expect(document.documentElement.dir).toBe('ltr')
  })
})

describe('LanguageSwitcher', () => {
  function renderSwitcher(initialPath: string) {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/:locale" element={<LocaleLayout />}>
            <Route path="login" element={<LanguageSwitcher />} />
          </Route>
        </Routes>
        <LocationProbe />
      </MemoryRouter>,
    )
  }

  it('lists the three languages with native names', async () => {
    await i18n.changeLanguage('fr')
    renderSwitcher('/fr/login')
    const select = screen.getByRole('combobox')
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.textContent)
    expect(options).toEqual(['Français', 'العربية', 'English'])
  })

  it('keeps the user on the same page when switching language', async () => {
    await i18n.changeLanguage('fr')
    renderSwitcher('/fr/login')
    await userEvent.selectOptions(screen.getByRole('combobox'), 'ar')
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/ar/login')
    })
    expect(i18n.language).toBe('ar')
  })
})
