import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { BarChart3, ChevronDown, LogOut, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { content } from '../constant.js'
import { Avatar } from './ui.jsx'

const itemClass =
  'flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-ink transition-colors hover:bg-canvas'

/**
 * The signed-in identity in the navbar — a single dropdown (Profile,
 * Reports, Sign out) instead of a separate identity link, Reports link,
 * and Sign-out button. Not a full ARIA menu widget (no arrow-key roving
 * tabindex) — just Tab between items, Escape closes and returns focus to
 * the trigger, click-outside closes — the same lightweight interaction
 * philosophy ConfirmModal uses, scaled down for a non-modal popup. No
 * shadow on the panel itself (DESIGN.md's flat-by-default rule) — an
 * opaque surface plus a border is what reads as "above" the page here,
 * same as every card in the app.
 */
export default function AccountMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function handleSignOut() {
    setOpen(false)
    // Signing out from a protected page hands over to the sign-in screen,
    // which is also where RequireAuth sends anyone without a session.
    logout()
    toast.success(content.nav.signedOutToast)
    navigate('/login', { replace: true })
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={content.nav.accountMenuAria}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-control px-1.5 py-1 text-sm text-ink-soft transition-colors hover:text-ink"
      >
        <Avatar name={user.name} src={user.avatarUrl} />
        {user.name}
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-card border border-line bg-surface py-1.5"
        >
          <Link
            role="menuitem"
            to="/profile"
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            <User size={16} aria-hidden="true" />
            {content.nav.profile}
          </Link>
          <Link
            role="menuitem"
            to="/reports"
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            <BarChart3 size={16} aria-hidden="true" />
            {content.reports.navLabel}
          </Link>
          <div className="my-1.5 border-t border-line" />
          <button
            role="menuitem"
            type="button"
            onClick={handleSignOut}
            className={`${itemClass} text-danger hover:bg-canvas hover:text-danger-hover`}
          >
            <LogOut size={16} aria-hidden="true" />
            {content.nav.signOut}
          </button>
        </div>
      ) : null}
    </div>
  )
}
