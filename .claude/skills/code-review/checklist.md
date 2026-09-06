# Code Review Checklist — Splitmate

## Correctness

- [ ] No function returns undefined when the caller expects a value
- [ ] .map() .filter() .find() only called on arrays that are guaranteed non-null
- [ ] Every async function call has await where needed
- [ ] useEffect dependency arrays are complete and correct
- [ ] No direct state mutation (always spread: {...obj, field: value})
- [ ] No array index used as React key — must use item.id

## Splitmate Data Rules ← violations here break balances silently

- [ ] Every expense query filters isDeleted === false before any logic
- [ ] Balance calculations filter deleted expenses first
- [ ] paidBy stores member.id (group-scoped) — NOT userId
- [ ] splits[].memberId stores member.id (group-scoped) — NOT userId
- [ ] balance.js reads splits[].amount directly — never divides expense.amount
- [ ] storage.\_upgradePendingMembers() is called on every registration path
- [ ] Dashboard filter: group.members.some(m => m.userId === user.id)

## Security

- [ ] Password field never appears in console.log, UI text, or component props
- [ ] localStorage never accessed directly outside src/data/storage.js
- [ ] No user input is rendered as raw HTML (dangerouslySetInnerHTML)
- [ ] No sensitive fields in URL params or query strings

## Code Quality

- [ ] No console.log left in production code
- [ ] No unused variables or imports
- [ ] No inline style={{ }} — Tailwind only
- [ ] No .then() chains — async/await only
- [ ] No hardcoded user IDs, group IDs, or test emails in production code
- [ ] All error states are handled (try/catch or .catch)

## React Conventions

- [ ] Components are functional (no class components)
- [ ] Hooks only called at the top level (not inside loops or conditions)
- [ ] useCallback / useMemo used where expensive operations are in render
- [ ] No prop drilling more than 2 levels deep — use context or lift state
