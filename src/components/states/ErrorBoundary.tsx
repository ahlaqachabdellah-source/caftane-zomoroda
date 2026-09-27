import { reportError } from '@/lib/monitoring'
import { Component, type ReactNode } from 'react'
import { withTranslation, type WithTranslation } from 'react-i18next'
import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Global React error boundary (Phase 12).
 *
 * Catches unexpected render/lifecycle errors anywhere below it and shows a
 * localized recovery screen (retry / back home). The technical error is
 * logged through console.error — the monitoring channel in development —
 * and is NEVER rendered: no stack traces, paths or internals in the UI.
 */
type ErrorBoundaryProps = WithTranslation & {
  children: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
}

class ErrorBoundaryInner extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: unknown, info: { componentStack?: string | null }) {
    // Technical details go to the dev/monitoring channel only.
    console.error('[error-boundary]', error, info.componentStack ?? '')
    // Phase 17: also forward to the monitoring backend when configured.
    reportError(error, { componentStack: info.componentStack ?? '' })
  }

  handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (!this.state.hasError) return this.props.children
    const { t } = this.props
    return (
      <div
        role="alert"
        className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center"
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <TriangleAlert className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          {t('errors.page_title')}
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          {t('errors.page_body')}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={this.handleRetry}>{t('states.retry')}</Button>
          <Button variant="outline" asChild>
            <a href="/">{t('errors.back_home')}</a>
          </Button>
        </div>
      </div>
    )
  }
}

const ErrorBoundary = withTranslation()(ErrorBoundaryInner)
export default ErrorBoundary
