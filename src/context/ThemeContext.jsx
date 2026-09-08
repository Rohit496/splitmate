import { createContext, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'splitmate_theme'

const ThemeContext = createContext(null)

function readStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/**
 * Light/dark theme for the whole app. Deliberately class-based, not
 * `prefers-color-scheme`-driven — every visit defaults to light regardless
 * of the OS setting, and only a user's own toggle (via AccountMenu) ever
 * switches it, persisted under localStorage's "splitmate_theme" key.
 *
 * Applies a `dark` class to <html>; index.css redefines the app's own
 * design tokens (--color-canvas, --color-ink, etc.) under an `html.dark`
 * selector, so every existing Tailwind class that already uses those tokens
 * (bg-canvas, text-ink, border-line, ...) re-themes automatically — no
 * `dark:` variant needed anywhere, matching this app's existing "design
 * tokens, not literal colors" convention. index.html carries a tiny inline
 * script that applies the same class before first paint (reading the same
 * key) so a returning dark-mode user never sees a flash of light first.
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readStoredTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Best-effort only — a private window or full quota shouldn't break
      // theming for the current tab, just its persistence across visits.
    }
  }, [theme])

  function toggleTheme() {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
