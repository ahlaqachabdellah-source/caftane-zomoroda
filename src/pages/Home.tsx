export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground sm:text-sm">
          Location de Caftans
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
          Caftan Zomoroda
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Foundation ready — database schema, security policies and seed data
          are in place. The storefront is built in the next phases.
        </p>
        <div className="mx-auto h-px w-16 bg-border" aria-hidden="true" />
      </div>
    </main>
  )
}
