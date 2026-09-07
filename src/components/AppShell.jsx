import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { content } from '../constant.js'
import { Avatar, Button } from './ui.jsx'

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

/** Chrome for signed-in pages: sticky 56px navbar over the warm page canvas. */
export default function AppShell({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  function handleSignOut() {
    // Signing out from a protected page hands over to the sign-in screen, which
    // is also where RequireAuth sends anyone without a session.
    logout()
    toast.success(content.nav.signedOutToast)
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-surface">
        <div className={`${PAGE} flex h-14 items-center justify-between`}>
          <div className="flex items-center gap-6">
            <Wordmark to="/dashboard" />
            {user ? (
              <Link
                to="/reports"
                aria-current={
                  location.pathname === '/reports' ? 'page' : undefined
                }
                className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
              >
                {content.reports.navLabel}
              </Link>
            ) : null}
          </div>
          {user ? (
            <div className="flex items-center gap-4">
              <Link
                to="/profile"
                aria-current={
                  location.pathname === '/profile' ? 'page' : undefined
                }
                className="inline-flex items-center gap-2 text-sm text-ink-soft transition-colors hover:text-ink"
              >
                <Avatar name={user.name} src={user.avatarUrl} />
                {user.name}
              </Link>
              <Button
                type="button"
                variant="secondary"
                className="gap-2 px-3 py-1.5 text-xs"
                onClick={handleSignOut}
              >
                <LogOut size={16} />
                {content.nav.signOut}
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      <main className={`${PAGE} flex-1 py-8`}>{children}</main>

      <footer className={`${PAGE} pb-8 text-xs text-ink-muted`}>
        {content.app.footer}
      </footer>
    </div>
  )
}
