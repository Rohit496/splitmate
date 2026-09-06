import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { LogOut, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { content } from '../constant.js'
import { Button } from './ui.jsx'

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

export const PAGE = 'mx-auto w-full max-w-[680px] px-4'

/** Chrome for signed-in pages: sticky 56px navbar over the warm page canvas. */
export default function AppShell({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

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
          <Wordmark to="/dashboard" />
          {user ? (
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-2 text-sm text-ink-soft">
                <User size={16} />
                {user.name}
              </span>
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

      <footer className={`${PAGE} pb-8 text-xs text-ink-muted`}>{content.app.footer}</footer>
    </div>
  )
}
