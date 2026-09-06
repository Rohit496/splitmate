import { Wordmark, PAGE } from './AppShell.jsx'

/** Shared frame for sign in / create account. No navbar — just a centered logo above the form. */
export default function AuthLayout({ title, intro, children, footer }) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className={`${PAGE} flex flex-1 flex-col justify-center py-10`}>
        <div className="mx-auto w-full max-w-[420px]">
          <div className="mb-8 flex justify-center">
            <Wordmark to="/" />
          </div>

          <div className="rounded-card border border-line bg-surface p-5">
            <h1 className="text-xl font-bold text-ink">{title}</h1>
            {intro ? <p className="mt-1.5 text-sm text-ink-soft">{intro}</p> : null}

            <div className="mt-6">{children}</div>
          </div>

          {footer ? <div className="mt-5 text-sm text-ink-soft">{footer}</div> : null}
        </div>
      </main>
    </div>
  )
}
