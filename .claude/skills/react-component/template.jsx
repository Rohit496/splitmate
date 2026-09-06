/**
 * Reference shape for a new Splitmate component. Copy the pattern, not the
 * names — swap in the real props, storage calls and copy for what you're
 * building. See SKILL.md for the rules this encodes.
 *
 * Variants:
 * - Full page (`src/pages/[PageName].jsx`): same shape, but the returned JSX
 *   is wrapped in `<AppShell>` (see any file in src/pages/ for the header/
 *   nav chrome) and the component is the default export routed in App.jsx.
 * - Small primitive (a new badge/tag/button variant): don't create a new
 *   file at all — add the export straight into src/components/ui.jsx next
 *   to the primitives it belongs with.
 * - Modal: follow ConfirmModal.jsx / AddExpenseModal.jsx instead of this
 *   file — focus trap, Escape-to-close, restored focus, scroll lock.
 */

import { useMemo } from 'react'
import * as storage from '../data/storage.js'
import { useStoreVersion } from '../hooks/useStore.js'
import { content } from '../constant.js'
import { EmptyState } from './ui.jsx'
// Pull in whichever ui.jsx primitives this component actually renders with,
// e.g.: import { Card, Money, CategoryTag, Avatar } from './ui.jsx'

// One block of this component's copy in constant.js, e.g.:
//   content.componentName = { emptyTitle: '...', emptyBody: '...', ... }
const copy = content.componentName

/**
 * <What this shows, and which page/component renders it.>
 *
 * Props are destructured at the top — no business logic here, only calls
 * into storage.js / utils/*.js and rendering.
 */
export default function ComponentName({ groupId, onItemAction }) {
  // Subscribe to writes anywhere in the app (including other tabs). The
  // read below is recomputed only when `version` changes, via useMemo.
  const version = useStoreVersion()

  const items = useMemo(
    () => storage.listSomethingForGroup(groupId),
    [groupId, version],
  )

  // Every list-shaped component renders something for the zero-items case
  // instead of silently rendering nothing.
  if (items.length === 0) {
    return <EmptyState title={copy.emptyTitle} body={copy.emptyBody} />
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-card border border-line bg-surface p-4 sm:p-5"
        >
          <p className="truncate text-sm text-ink">{item.label}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{copy.itemMeta(item)}</p>
        </li>
      ))}
    </ul>
  )
}
