import { useEffect } from 'react'

/**
 * Sets the browser tab title for as long as the calling page is mounted.
 * Every route calls this with its own title from `content.pageTitles` (see
 * constant.js) — there's no other place document.title gets touched.
 */
export function useDocumentTitle(title) {
  useEffect(() => {
    if (!title) return
    document.title = title
  }, [title])
}
