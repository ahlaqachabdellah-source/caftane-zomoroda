import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import { i18nReady } from '@/i18n'
import App from './App.tsx'

// Phase 14: locale bundles are lazy — render only once the detected
// language (+ fallback) is loaded so users never see raw keys flash.
void i18nReady.then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <HelmetProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </HelmetProvider>
    </StrictMode>,
  )
})
