import { useTranslation } from 'react-i18next'

export default function Home() {
  const { t } = useTranslation()

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground rtl:tracking-normal sm:text-sm">
          {t('home.kicker')}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
          {t('home.title')}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t('home.body')}
        </p>
        <div className="mx-auto h-px w-16 bg-border" aria-hidden="true" />
      </div>
    </main>
  )
}
