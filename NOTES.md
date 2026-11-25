# NOTES.md — Payment History Screen

Key decisions and trade-offs made while implementing the Payment History screen.

## 1. Refresh behavior: Web vs Native

**Native:** Pull-to-refresh via `RefreshControl` on the `SmartyFlatList`. The native `StackRootFlatList` wrapper already supports `onRefresh`, so we attach a `RefreshControl` to the list.

**Web:** A visible "Refresh" button in the header (only shown on `Platform.OS === 'web'`). Web browsers expose no pull-to-refresh gesture on the page, so a visible, explicitly-labeled button is the accessible and obvious equivalent. It is disabled while a refresh is in flight.

## 2. Data fetching: `useInfiniteQuery`

React Query (`@tanstack/react-query`) is already a dependency of the project. We chose `useInfiniteQuery` over a plain `useQuery` because:

- It gives `fetchNextPage`, `hasNextPage`, and `refetch` for free, which maps directly onto the pagination, load-more, and refresh requirements.
- There was no existing `useInfiniteQuery` precedent in the codebase, but React Query supports it natively and it's the idiomatic fit for load-more pagination.

Caveat: when the total number of payments is an exact multiple of page size (20), one extra empty request is made on the final page to discover there are no more pages. This is acceptable and common.

## 3. "Has more" detection

The mock API returns a plain `Payment[]` with no total count and no "next page" link. We infer "has more" when a page returns a full `PAYMENTS_PAGE_SIZE` (20) of items. `getNextPageParam` returns `allPages.length` when the last page was full (more pages), else `undefined` (end of list).

## 4. Refresh = `refetch()` from page 0

Both `onRefresh` (pull-to-refresh / button) and `onRetry` call `refetch()`, which reloads the query from page 0. Each refresh adds a new payment at the top of the list (matching mock behavior), so the user sees the refresh take effect immediately.

## 5. Error handling

Errors are written to the `ApiErrorStateStore` (`setErrorText`/`reset`) following the existing `changeEmailApiInteraction` pattern. The view renders:

- First-load failure → error panel + Retry button
- Load-more failure → error panel + Retry button (the failing page is retried on `refetch`)
- Empty state → message + Retry button

The user can always retry.

## 6. Layering and import rules followed

- Imports point inward (towards foundation libs) or sideways within a layer.
- Data layer order: `api-controller → api → store → core → dx-api`
- `components` (tagged `scope:shared`) only depends on other `scope:shared` libs and `api-controller` — never `api` directly.
- All imports go through library barrels (`src/index.ts`), never file paths.
- No new library tags were introduced; `components` remains `scope:shared`.

## 7. Files that would change on native

The shared `PaymentHistoryScreenView` is used by both web and native with zero platform-specific shell changes. The only platform branch inside the view is `Platform.OS === 'web'` for the refresh button vs `RefreshControl`. The app shells (`page.tsx` on web, `PaymentHistoryScreen.tsx` on native) needed no logic changes.

## 8. What was intentionally left out

- Unit tests (not required per the README).
- Date/time localization beyond `toLocaleDateString` defaults.
- Dark-theme-specific color overrides (uses semantic Tailwind classes that already adapt).
