# plan.md — Payment History Screen (Web + Native)

## Goal
Build a shared **Payment History** screen showing the subscriber's payments newest-first (description, amount, date, status), with pagination (load more on scroll), refresh, and full loading/empty/error/retry handling. Web and Native share the same screen code from `libs/components`; platform-specific code only where required (pull-to-refresh on native; a refresh button on web).

## Constraints & conventions (from README)
- Nx monorepo: 2 apps (web = Next.js + React Native Web; native = Expo / React Native), 23 shared libs
- 7-layer onion architecture; imports point **inward** or **sideways within a layer**
- Data layer order: `api-controller → api → store → core → dx-api`
- UI libs tagged `scope:shared` (`components`, `controls`) may only depend on other `scope:shared` libs and `api-controller` — never `api` directly
- Import through the barrel (`src/index.ts`), never by file path
- ESLint enforces module boundaries; CI runs `typecheck` and `lint --max-warnings=0`
- React Query (`@tanstack/react-query`) is the data-fetching lib; **no `useInfiniteQuery` precedent exists** — decision noted below
- Mock API: `GET /subscriber/payment?page=&size=&sort=` returns a plain `Payment[]` (no total count, no "next page" link). Scenarios: `default` (100 payments), `empty`, `error` (first load fails), `next-page-error` (later pages fail)
- Generated client: `dxApi.subscriber.subscriberPaymentGet({page, size, sort})`; `Payment` type: `id, paymentDate, amount, currency, description, status (PAID|PENDING|FAILED|REFUNDED)`
- "Has more" is inferred when a page returns a full `size` of items; end when fewer than `size` (or empty)

## Existing stubs (already wired, render nothing)
- `libs/components/src/payment-history/PaymentHistoryScreenView.tsx` — empty `View`
- `apps/web/src/app/dashboard/account/payment-history/page.tsx` — `StackRootView` + title + view
- `apps/app/src/app/screen/you/payment-history/PaymentHistoryScreen.tsx` — `StackRootView` + view

## Layer plan & files

### 1. `dx-api` (foundation) — NO CHANGE
`Payment` type + `subscriberPaymentGet` already exist.

### 2. `core` (model + mapper)
**Create:**
- `libs/core/src/model/payment.ts` — app `Payment` model (`id, paymentDate, amount, currency, description, status`) + `PaymentStatus` type
- `libs/core/src/mapper/paymentResponseMapper.ts` — `mapPaymentDtoToPayment(dto): Payment` (handles optional fields, defaults)
**Update:**
- `libs/core/src/index.ts` — export new model + mapper

### 3. `api` (React Query)
**Create:**
- `libs/api/src/user/subscriberPayment.ts`
  - `subscriberPaymentsQueryKey = ['subscriberPayments']`, `PAGE_SIZE = 20`
  - `useSubscriberPaymentApiFetchFn(): (page) => Promise<PaymentDto[]>` using the **generated** `dxApi.subscriber.subscriberPaymentGet({page, size, sort: ['paymentDate,desc']})`
  - `useSubscriberPaymentQuery(): UseInfiniteQueryResult<PaymentDto[], ApiError>` — `useInfiniteQuery`; `getNextPageParam` returns `allPages.length` when the last page was full (more pages), else `undefined`
**Update:**
- `libs/api/src/index.ts` — export `subscriberPayment`

> Decision: use `useInfiniteQuery` (React Query is already a dependency). It gives `fetchNextPage`/`hasNextPage`/`refetch` for free. Caveat: when the total is an exact multiple of page size, one extra empty request is made on the final page — acceptable and common.

### 4. `api-controller`
**Create:**
- `libs/api-controller/src/user/userPayments.ts`
  - `useGetUserPayments(): PaymentsApiResult` where:
    ```ts
    interface PaymentsApiResult {
      payments: Payment[];       // mapped + combined across pages
      isLoading: boolean;        // initial load
      isLoadingMore: boolean;    // fetchNextPage in flight
      isSuccess: boolean;
      isError: boolean;
      error?: ApiError | null;
      hasNextPage: boolean;
      fetchNextPage: () => void;
      refetch: () => void;       // full refresh (reloads from page 0)
    }
    ```
  - Combines `query.pages`, maps each DTO → core `Payment` via `mapPaymentDtoToPayment`
**Update:**
- `libs/api-controller/src/index.ts` — export `userPayments`

### 5. `ui-logic` (presentation logic)
**Create:**
- `libs/ui-logic/src/payment/paymentUIData.ts`
  - `formatPaymentDate(paymentDate): string` (display date)
  - `formatPaymentAmount(amount, currency): string` (via `core` `SmartyPrice`)
  - `getPaymentStatusLabel(status)`, `getPaymentStatusColor(status)`
  - `PaymentDisplayData` interface
**Update:**
- `libs/ui-logic/src/index.ts` — export `paymentUIData`

### 6. `ui-api-interaction` (bridge: pagination + refresh + retry + errors)
**Create:**
- `libs/ui-api-interaction/src/account-settings/paymentHistoryApiInteraction.ts`
  - `usePaymentHistoryApiInteraction()` → `{ payments, isLoading, isLoadingMore, hasNextPage, isError, error, onRefresh, onRetry, loadMore, refreshing }`
  - Owns `useGetUserPayments()`; on error writes to `useApiErrorStateStore` (`setErrorText`/`reset`) following the `changeEmailApiInteraction` pattern; `onRefresh` → `refetch()`, `onRetry` → `refetch()`, `loadMore` → `fetchNextPage()` (guarded by `hasNextPage && !isLoadingMore`)
**Update:**
- `libs/ui-api-interaction/src/index.ts` — export `paymentHistoryApiInteraction`

### 7. `components` (shared view, `scope:shared`)
**Rework:**
- `libs/components/src/payment-history/PaymentHistoryScreenView.tsx`
  - Calls `usePaymentHistoryApiInteraction()` directly (same pattern as `ChangeEmailScreenView`)
  - Renders `SmartyRootScreenView` + `SmartyFlatList`
  - `isLoading` → skeleton placeholders (`SmartyFlatList` built-in)
  - `renderItem` → `PaymentHistoryListItem` (description, amount, date, status + accessibility labels)
  - `onEndReached` → `loadMore` (guarded); `ListFooterComponent` → loading spinner while `isLoadingMore`
  - Empty state → message + retry button
  - Error state → `ApiErrorAlertPanel`-style message + retry button
  - Refresh: **native** = attach `RefreshControl` to the list (pull-to-refresh); **web** = visible "Refresh" button (browsers have no pull-to-refresh gesture — decision documented below)
  - Uses `Platform.OS` from `react-native` for the branch (already used by `controls`/`components`)
**Create:**
- `libs/components/src/payment-history/PaymentHistoryListItem.tsx` — single payment row
**Update:**
- `libs/components/src/index.ts` — `PaymentHistoryScreenView` already exported; export `PaymentHistoryListItem` if needed

### 8. Apps (platform shells — thin)
- `apps/web/src/app/dashboard/account/payment-history/page.tsx` — keep as-is (renders `StackRootView` + title + view)
- `apps/app/src/app/screen/you/payment-history/PaymentHistoryScreen.tsx` — keep as-is (renders `StackRootView` + view)
- Since the view owns the interaction hook, shells need no logic change; verify they still compile with the new view props/behavior.

### 9. `language`
**Update:** `libs/language/src/paymentHistoryStrings.ts`
- Add: empty title/message, error title/message, retry label, refresh label, list `aria`/accessibility label, status labels (`Paid`/`Pending`/`Failed`/`Refunded`)
- `language.ts` already spreads `paymentHistoryStrings`, so `en.<newKey>` works automatically

## Implementation phases (actionable steps)

| Phase | Step | Files |
|-------|------|-------|
| 1 | Core `Payment` model + DTO mapper | `core/src/model/payment.ts`, `core/src/mapper/paymentResponseMapper.ts`, `core/src/index.ts` |
| 2 | API layer — infinite query + fetch fn | `api/src/user/subscriberPayment.ts`, `api/src/index.ts` |
| 3 | api-controller — `useGetUserPayments` | `api-controller/src/user/userPayments.ts`, `api-controller/src/index.ts` |
| 4 | ui-logic — date/amount/status formatting | `ui-logic/src/payment/paymentUIData.ts`, `ui-logic/src/index.ts` |
| 5 | ui-api-interaction — pagination/refresh/retry/errors | `ui-api-interaction/src/account-settings/paymentHistoryApiInteraction.ts`, `ui-api-interaction/src/index.ts` |
| 6 | Shared component view + list item | `components/src/payment-history/PaymentHistoryScreenView.tsx`, `.../PaymentHistoryListItem.tsx`, `components/src/index.ts` |
| 7 | Language strings | `language/src/paymentHistoryStrings.ts` |
| 8 | Verify web + native shells compile | `apps/web/.../page.tsx`, `apps/app/.../PaymentHistoryScreen.tsx` |
| 9 | CI checks + scenario testing | `npx nx run-many -t typecheck lint`; run web with each `NEXT_PUBLIC_MOCK_API_SCENARIO` |

## Expected behavior per mock scenario
- `default`: 100 payments newest-first; page 0 shows 20; scrolling loads more (append)
- `empty`: empty state shown; retry available
- `error`: first load fails → error state + retry; retry succeeds
- `next-page-error`: page 0 loads, later page fails while loading more → error state + retry loads that page

## Open decisions (for NOTES.md)
1. **Web refresh = visible "Refresh" button.** Native supports pull-to-refresh via `RefreshControl`; web browsers expose no pull-to-refresh gesture on the page, so a visible button is the accessible, obvious equivalent. Rationale documented per the README ("On web, decide what refresh should mean and tell us why").
2. **`useInfiniteQuery` chosen** although no precedent exists — React Query is already a dependency and it's the idiomatic fit for load-more pagination.
3. **Refresh = `refetch()`** reloads from page 0 and replaces the list (new payment appears at top, matching mock behavior).

## Verification
- `npx nx run-many -t typecheck lint` → no errors, no warnings (`--max-warnings=0`)
- Open `http://localhost:3000` → Account → Payment history; check each `NEXT_PUBLIC_MOCK_API_SCENARIO`
- Confirm: newest-first ordering; description/amount/date/status on every row; pagination appends; refresh replaces; retry restores; skeleton while loading; accessible labels
