/**
 * The one Supabase client for the app. AuthContext (auth.*) and storage.js
 * (from(...) tables) are the only modules that should import this —
 * everything else keeps going through useAuth() / storage.js, same as before.
 */

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !publishableKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env and fill them in.',
  )
}

export const supabase = createClient(url, publishableKey, {
  auth: {
    // Default storage is window.localStorage — this is what makes a session
    // survive closing and reopening the browser, not just a page refresh.
    persistSession: true,
    autoRefreshToken: true,
    // A "forgot password" email links to /reset-password with a recovery
    // token in the URL. This is what makes the client pick that up and turn
    // it into a real (short-lived, single-purpose) session automatically.
    detectSessionInUrl: true,
  },
})
