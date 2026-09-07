import { useSyncExternalStore } from 'react'
import { getVersion, hasSyncedOnce, subscribe } from '../data/storage.js'

/**
 * Re-renders the calling component whenever anything is written to storage.
 *
 * The snapshot is a plain counter rather than the data itself, so React always
 * gets a stable value to compare. Read the data you need with useMemo keyed on
 * the returned version.
 */
export function useStoreVersion() {
  return useSyncExternalStore(subscribe, getVersion, getVersion)
}

/**
 * True once the current session has completed its first sync with Supabase
 * (success or failure). Every storage.js read is synchronous against an
 * in-memory cache that starts empty, so a page that renders immediately on
 * a fresh login can flash "no groups"/"not found" before the real data
 * arrives — check this before trusting an empty result and show a loading
 * state instead. Shares the same subscription as useStoreVersion() (any
 * write, including the first sync completing, notifies both).
 */
export function useStoreReady() {
  return useSyncExternalStore(subscribe, hasSyncedOnce, hasSyncedOnce)
}
