export default function Home() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center space-y-6">
        <p className="text-xs sm:text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">
          Location de Caftans
        </p>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground">
          Caftan Rental
        </h1>
        <p className="text-sm sm:text-base leading-relaxed text-muted-foreground">
          Foundation ready — database schema, security policies and seed data
          are in place. The storefront is built in the next phases.
        </p>
        <div className="mx-auto h-px w-16 bg-border" aria-hidden="true" />
      </div>
    </main>
  )
}
