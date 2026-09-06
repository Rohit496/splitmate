import { Navigate, Link } from 'react-router-dom'
import {
  ArrowRight,
  LogIn,
  UserPlus,
  Receipt,
  ArrowRightLeft,
  Scale,
  Clock,
  History,
  Smartphone,
  Quote,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { content } from '../constant.js'
import { Wordmark } from '../components/AppShell.jsx'
import BalanceBar from '../components/BalanceBar.jsx'
import { ButtonLink } from '../components/ui.jsx'

const copy = content.landing

// This surface runs wider than the app's own 680px operate-mode container —
// a marketing page with a features grid and a proof section needs room a
// single reading column can't give it. Every signed-in page keeps AppShell's
// PAGE constant; this is the one deliberate exception for this route (see
// .impeccable/surfaces/src-pages-landing-jsx.md).
const WIDE = 'mx-auto w-full max-w-[1120px] px-6 sm:px-8'

const STEP_ICONS = [UserPlus, Receipt, ArrowRightLeft]
const FEATURE_ICONS = [Clock, History, Smartphone]

export default function Landing() {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-surface">
        <div className={`${WIDE} flex h-14 items-center justify-between`}>
          <Wordmark to="/" />
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
          >
            <LogIn size={16} aria-hidden="true" />
            {copy.headerSignIn}
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero — the mechanism is visible before anyone has to take our word
            for it: a real settle-up, right beside the headline. */}
        <section
          className={`${WIDE} grid gap-10 py-16 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16`}
        >
          <div>
            {/* Bigger than the shared Display token on purpose: this hero sits
                alone in a wide column, not inside a narrow stat card, so it can
                safely scale with the viewport where text-2xl cannot. */}
            <h1 className="text-[clamp(2rem,4.5vw,3.75rem)] font-extrabold leading-[1.05] tracking-[-0.02em] text-ink">
              {copy.headline}
            </h1>
            <p className="mt-5 max-w-[46ch] text-base text-ink-soft">{copy.subhead}</p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <ButtonLink to="/register" className="gap-2 px-5 py-3 text-base">
                {copy.getStarted}
                <ArrowRight size={18} aria-hidden="true" />
              </ButtonLink>
              <ButtonLink to="/login" variant="secondary" className="gap-2 px-5 py-3 text-base">
                <LogIn size={18} aria-hidden="true" />
                {copy.signIn}
              </ButtonLink>
            </div>
          </div>

          {/* The product's core moment, shown rather than described. */}
          <div>
            <div className="overflow-hidden rounded-card border border-line bg-surface">
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
                <BalanceBar label={copy.demoSettlementLabel} cents={copy.demoSettlementCents} tone="credit" />
              </div>
            </div>
            <p className="mt-2.5 text-center text-xs text-ink-muted">{copy.demoCaption}</p>
          </div>
        </section>

        {/* How it works — a real sequence, so the steps stay numbered/ordered
            rather than three interchangeable cards. */}
        <section className="border-t border-line bg-surface py-16 sm:py-20">
          <div className={WIDE}>
            <h2 className="text-xl font-bold text-ink">{copy.howItWorksHeading}</h2>

            <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-3">
              {copy.steps.flatMap((step, i) => {
                const Icon = STEP_ICONS[i]
                const block = (
                  <div
                    key={step.title}
                    className="flex flex-1 items-start gap-4 sm:flex-col sm:items-start sm:gap-0"
                  >
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-control bg-canvas text-ink">
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <div className="sm:mt-4">
                      <h3 className="text-lg font-semibold text-ink">{step.title}</h3>
                      <p className="mt-1.5 max-w-[32ch] text-sm text-ink-soft">{step.body}</p>
                    </div>
                  </div>
                )
                if (i === 0) return [block]
                return [
                  <ArrowRight
                    key={`arrow-${step.title}`}
                    aria-hidden="true"
                    size={18}
                    className="mt-2.5 hidden shrink-0 text-ink-muted sm:block"
                  />,
                  block,
                ]
              })}
            </div>
          </div>
        </section>

        {/* Features — one signature capability at full weight, three
            supporting ones below it. Not four identical tiles. */}
        <section className="py-16 sm:py-20">
          <div className={WIDE}>
            <h2 className="text-xl font-bold text-ink">{copy.featuresHeading}</h2>

            <div className="mt-8 rounded-card border border-line bg-surface p-6 sm:p-8">
              <span className="inline-flex size-11 items-center justify-center rounded-control bg-canvas text-ink">
                <Scale size={22} aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-xl font-bold text-ink">{copy.signatureFeature.title}</h3>
              <p className="mt-2 max-w-[64ch] text-base text-ink-soft">{copy.signatureFeature.body}</p>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {copy.features.map((feature, i) => {
                const Icon = FEATURE_ICONS[i]
                return (
                  <div key={feature.title} className="rounded-card border border-line bg-surface p-5">
                    <span className="inline-flex size-9 items-center justify-center rounded-control bg-canvas text-ink-soft">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <h3 className="mt-3 text-base font-semibold text-ink">{feature.title}</h3>
                    <p className="mt-1 text-sm text-ink-soft">{feature.body}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Proof — the real settlement math, plus one honest quote from the
            same demo trip shown in the hero (not a fabricated testimonial). */}
        <section className="border-y border-line bg-canvas py-16 sm:py-20">
          <div className={`${WIDE} grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16`}>
            <div>
              <h2 className="text-xl font-bold text-ink">{copy.proofHeading}</h2>
              <p className="mt-4 max-w-[48ch] text-base text-ink-soft">{copy.proofStatLine}</p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-flat-bg px-3 py-1 text-xs font-medium text-flat-fg line-through">
                  15 possible debts
                </span>
                <ArrowRight aria-hidden="true" size={16} className="shrink-0 text-ink-muted" />
                <span className="inline-flex items-center rounded-full bg-pos-bg px-3 py-1 text-xs font-semibold text-pos-fg">
                  5 payments, guaranteed
                </span>
              </div>
            </div>

            <div className="rounded-card border border-line bg-surface p-6">
              <Quote aria-hidden="true" size={22} className="text-ink-muted" />
              <p className="mt-3 text-lg text-ink">&ldquo;{copy.proofQuote}&rdquo;</p>
              <p className="mt-3 text-sm text-ink-soft">— {copy.proofQuoteAttribution}</p>
            </div>
          </div>
        </section>

        {/* Final CTA — one dark strip, one action. */}
        <section className="bg-ink py-16 sm:py-20">
          <div className={`${WIDE} flex flex-col items-center gap-5 text-center`}>
            <h2 className="max-w-[26ch] text-xl font-bold text-canvas">{copy.finalCtaHeading}</h2>
            <p className="max-w-[46ch] text-base text-ink-muted">{copy.finalCtaBody}</p>
            <ButtonLink to="/register" className="gap-2 px-5 py-3 text-base">
              {copy.finalCtaButton}
              <ArrowRight size={18} aria-hidden="true" />
            </ButtonLink>
          </div>
        </section>
      </main>

      <footer className={`${WIDE} py-8 text-xs text-ink-muted`}>{copy.footer}</footer>
    </div>
  )
}
