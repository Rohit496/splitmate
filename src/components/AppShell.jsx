import { Link } from 'react-router-dom'
import { content } from '../constant.js'
import AccountMenu from './AccountMenu.jsx'

/** Wordmark: the mascot from public/logo.svg, plus a two-tone name. */
export function Wordmark({ to = '/' }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 text-base font-bold tracking-[-0.01em]"
    >
      <img src="/logo.svg" alt="" className="size-7 shrink-0" />
      <span className="text-ink">
        {content.app.nameFirst}
        <span className="text-primary">{content.app.nameSecond}</span>
      </span>
    </Link>
  )
}

// AuthLayout also imports this for its outer frame, but that page's actual
// form is capped at its own max-w-[420px] and centered independently, so
// widening PAGE here doesn't change how login/register/etc. look.
export const PAGE = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8'

/** Chrome for signed-in pages: sticky 56px navbar over the warm page canvas.
    The signed-in identity is a single AccountMenu dropdown (Profile,
    Reports, Sign out) rather than separate nav links + a sign-out button. */
export default function AppShell({ children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-surface">
        <div className={`${PAGE} flex h-14 items-center justify-between`}>
          <Wordmark to="/dashboard" />
          <AccountMenu />
        </div>
      </header>

      <main className={`${PAGE} flex-1 py-8`}>{children}</main>

      <footer className={`${PAGE} pb-8 text-xs text-ink-muted`}>
        {content.app.footer}
      </footer>
    </div>
  )
}
