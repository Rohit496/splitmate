import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext.jsx'
import { content } from '../constant.js'

/**
 * Standalone light/dark toggle in the navbar, to the left of AccountMenu —
 * icon-only (no visible label), always visible rather than tucked inside
 * the account dropdown. See ThemeContext.jsx and index.css's `html.dark`
 * block (Key conventions → "Light/dark theme...") for how the theme itself
 * is applied.
 */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      aria-pressed={theme === 'dark'}
      aria-label={
        theme === 'dark' ? content.nav.lightModeAria : content.nav.darkModeAria
      }
      onClick={toggleTheme}
      className="flex items-center justify-center rounded-control p-1.5 text-ink-soft transition-colors hover:bg-canvas hover:text-ink"
    >
      {theme === 'dark' ? (
        <Sun size={18} aria-hidden="true" />
      ) : (
        <Moon size={18} aria-hidden="true" />
      )}
    </button>
  )
}
