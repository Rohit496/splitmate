import { useSyncExternalStore } from 'react'
import { getVersion, subscribe } from '../data/storage.js'

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
