import '@testing-library/jest-dom/vitest'
import i18n, { i18nReady } from '@/i18n'

// Wait for i18next init, then pin French as the test language so
// translation-dependent assertions are deterministic.
await i18nReady
await i18n.changeLanguage('fr')
