import { Navigate, Link } from 'react-router-dom'
import { ArrowRight, LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { content } from '../constant.js'
import { Wordmark, PAGE } from '../components/AppShell.jsx'
import BalanceBar from '../components/BalanceBar.jsx'
import { ButtonLink } from '../components/ui.jsx'

const copy = content.landing

export default function Landing() {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-surface">
        <div className={`${PAGE} flex h-14 items-center justify-between`}>
          <Wordmark to="/" />
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
          >
            <LogIn size={16} />
            {copy.headerSignIn}
          </Link>
        </div>
      </header>

      <main className={`${PAGE} flex-1 py-12`}>
        <section>
          <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-ink">{copy.headline}</h1>

          <p className="mt-3 max-w-[52ch] text-base text-ink-soft">{copy.intro}</p>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <ButtonLink to="/register" className="gap-2">
              {copy.getStarted}
              <ArrowRight size={16} />
            </ButtonLink>
            <ButtonLink to="/login" variant="secondary" className="gap-2">
              <LogIn size={16} />
              {copy.signIn}
            </ButtonLink>
          </div>
        </section>

        {/* The product's core moment, shown rather than described. */}
        <section className="mt-8 overflow-hidden rounded-card border border-line bg-surface">
          <div className="flex items-baseline justify-between border-b border-line px-5 py-3.5">
            <span className="text-sm font-semibold text-ink">{copy.demoGroupName}</span>
            <span className="text-xs text-ink-muted">{copy.demoPeopleCount(3)}</span>
          </div>

          <ul>
            {copy.demoExpenses.map((expense) => (
              <li
                key={expense.description}
                className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-base text-ink">{expense.description}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">{copy.demoPayerLine(expense.payer)}</p>
                </div>
                <span className="num shrink-0 text-lg font-bold text-ink">{expense.amount}</span>
              </li>
            ))}
          </ul>

          <div className="px-5 py-4">
            <p className="mb-2.5 text-xs text-ink-muted">{copy.settlesAs}</p>
            <BalanceBar
              label={copy.demoSettlementLabel}
              cents={copy.demoSettlementCents}
              tone="credit"
            />
          </div>
        </section>

        <section className="mt-8 flex flex-col gap-2">
          {copy.capabilities.map((capability) => (
            <div key={capability.title} className="rounded-card border border-line bg-surface p-5">
              <h2 className="text-lg font-semibold text-ink">{capability.title}</h2>
              <p className="mt-1.5 text-sm text-ink-soft">{capability.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-base text-ink">{copy.ctaLine}</p>
          <ButtonLink to="/register" className="gap-2">
            {copy.getStarted}
            <ArrowRight size={16} />
          </ButtonLink>
        </section>
      </main>

      <footer className={`${PAGE} pb-10 text-xs text-ink-muted`}>{copy.footer}</footer>
    </div>
  )
}
