# README-DONE.md — Payment History Screen (Implementation Record)

This document records the work done to build the Payment History screen for both Web and Native, the phases of implementation, the reasoning behind key choices, and how the implementation agrees with the original app structure described in `README.md` and on https://beapper.eu/careers/tech-interview-2026.

## 1. Goal

Build a shared **Payment History** screen showing the subscriber's payments newest-first (description, amount, date, status), with:

1. Pagination — load the first page, then load more as the user scrolls.
2. Refresh — pull-to-refresh on native; a visible Refresh button on web.
3. Full state handling — loading, empty, failure on first load, failure while loading more; retry always available.
4. Code sharing — web and native use the same screen code from `libs/components`; platform-specific code only where required.
5. Layering — follow the project's 7-layer onion architecture and import rules.

## 2. Original app structure (from README.md and the tech-interview page)

| Aspect | Description |
|--------|-------------|
| Repo | Nx monorepo; 2 apps (web = Next.js + React Native Web; native = Expo / React Native), 23 shared libraries |
| Architecture | 7-layer onion; imports point inward or sideways within a layer |
| Data layer order | `api-controller → api → store → core → dx-api` |
| UI libs | `components` and `controls` tagged `scope:shared`; may only depend on other `scope:shared` libs and `api-controller`; never `api` directly |
| Imports | Through the barrel (`src/index.ts`); never by file path |
| Data fetching | React Query (`@tanstack/react-query`) |
| API | `GET /subscriber/payment?page=&size=&sort=` returns `Payment[]` (no total count, no "next page" link) |
| Generated client | `dxApi.subscriber.subscriberPaymentGet({page, size, sort})` |
| Mock API | Scenarios: `default` (100 payments), `empty`, `error`, `next-page-error` |
| Existing stubs | `PaymentHistoryScreenView` (shared), `page.tsx` (web), `PaymentHistoryScreen.tsx` (native) — all wired but rendering nothing |
| Reference feature | Email address screen, complete across all 7 layers |
| CI | `npx nx run-many -t typecheck lint` with `--max-warnings=0` |

## 3. Phases of implementation (from plan.md)

| Phase | Step | Files | Status |
|-------|------|-------|--------|
| 1 | Core `Payment` model + DTO mapper | `core/src/model/payment.ts`, `core/src/mapper/paymentResponseMapper.ts`, `core/src/index.ts` | ✅ Done |
| 2 | API layer — infinite query + fetch fn | `api/src/user/subscriberPayment.ts`, `api/src/index.ts` | ✅ Done |
| 3 | api-controller — `useGetUserPayments` | `api-controller/src/user/userPayments.ts`, `api-controller/src/index.ts` | ✅ Done |
| 4 | ui-logic — date/amount/status formatting | `ui-logic/src/payment/paymentUIData.ts`, `ui-logic/src/index.ts` | ✅ Done |
| 5 | ui-api-interaction — pagination/refresh/retry/errors | `ui-api-interaction/src/account-settings/paymentHistoryApiInteraction.ts`, `ui-api-interaction/src/index.ts` | ✅ Done |
| 6 | Shared component view + list item | `components/src/payment-history/PaymentHistoryScreenView.tsx`, `.../PaymentHistoryListItem.tsx` | ✅ Done |
| 7 | Language strings | `language/src/paymentHistoryStrings.ts` | ✅ Done (merged into Phase 6) |
| 8 | Verify web + native shells compile | `apps/web/.../page.tsx`, `apps/app/.../PaymentHistoryScreen.tsx` | ✅ Done |
| 9 | CI checks + scenario testing | `npx nx run-many -t typecheck lint`; each mock scenario | ✅ Done |

## 4. Reasoning and agreement with original app structure

### 4.1 Layering

Every piece of code was placed in the layer it belongs to, following the reference Email address feature:

| Layer | Responsibility | Payment History code |
|-------|---------------|----------------------|
| `dx-api` | Generated API types + client | `Payment` type + `subscriberPaymentGet` (already existed, no change) |
| `core` | Domain model + DTO mappers | `Payment` interface, `PaymentStatus`, `mapPaymentDtoToPayment()` |
| `api` | React Query hooks | `useSubscriberPaymentApiFetchFn()`, `useSubscriberPaymentQuery()` (`useInfiniteQuery`) |
| `api-controller` | Orchestration across data libs | `useGetUserPayments()` — combines pages, maps to domain model |
| `ui-logic` | Presentation formatting | `formatPaymentDate()`, `formatPaymentAmount()`, `getPaymentStatusLabel()`, `mapPaymentToDisplayData()` |
| `ui-api-interaction` | Bridge between UI and data | `usePaymentHistoryApiInteraction()` — pagination, refresh, retry, errors via `ApiErrorStateStore` |
| `components` (`scope:shared`) | Shared UI view | `PaymentHistoryScreenView` + `PaymentHistoryListItem`; uses `Platform.OS` for web/native refresh branch |
| Apps | Thin platform shells | `page.tsx` (web), `PaymentHistoryScreen.tsx` (native) — unchanged, render the shared view |

The import rules were respected throughout:
- `components` imports only from `scope:shared` libs (`controls`, `controls-basic`, `language`, `ui-logic`, `ui-api-interaction`) and from `api-controller` — never `api` directly.
- Data layer order `api-controller → api → store → core → dx-api` is followed.
- All imports go through library barrels.

### 4.2 React Query and `useInfiniteQuery`

React Query is the project's data-fetching library. Although there was no existing `useInfiniteQuery` precedent, it is the idiomatic React Query tool for load-more pagination and provides `fetchNextPage`, `hasNextPage`, and `refetch` out of the box. It was adopted with a documented caveat (one extra empty request when the total is an exact multiple of page size).

### 4.3 "Has more" inference

The mock API returns a plain array with no total count or "next page" link, exactly as described in the README. "Has more" is inferred when a page returns a full `PAYMENTS_PAGE_SIZE` (20) of items; the query ends when a page returns fewer than 20 (or empty).

### 4.4 Refresh: web vs native

Per the README instruction ("On web, decide what 'refresh' should mean and tell us why"):

- **Native:** `RefreshControl` on the list (pull-to-refresh), consistent with the existing `StackRootFlatList` wrapper.
- **Web:** A visible "Refresh" button, because browsers expose no pull-to-refresh gesture on the page. A visible button is accessible, obvious, and works for mouse/keyboard users.

### 4.5 Error handling and retry

Errors are written to `ApiErrorStateStore` (`setErrorText`/`reset`), following the `changeEmailApiInteraction` pattern. The view shows:
- Error panel + Retry button on first-load failure or load-more failure
- Empty state message + Retry button when there are no payments
- Skeleton placeholders via `SmartyFlatList`'s built-in `isLoading` prop while fetching

The user can always retry.


## 5. Verification

- `npx nx run-many -t typecheck lint` — **all 25 projects pass**, no errors, no warnings (`--max-warnings=0`).
- Dev server starts successfully on http://localhost:3000; the Payment History page compiles and loads at runtime.
- Each mock scenario (`default`, `empty`, `error`, `next-page-error`) is handled: newest-first ordering, description/amount/date/status on every row, pagination appends, refresh replaces the list, retry restores, skeleton while loading.

## 6. Files created or modified

**Created:**
- `libs/core/src/model/payment.ts`
- `libs/core/src/mapper/paymentResponseMapper.ts`
- `libs/api/src/user/subscriberPayment.ts`
- `libs/api-controller/src/user/userPayments.ts`
- `libs/ui-logic/src/payment/paymentUIData.ts`
- `libs/ui-api-interaction/src/account-settings/paymentHistoryApiInteraction.ts`
- `libs/components/src/payment-history/PaymentHistoryScreenView.tsx` (rewritten)
- `libs/components/src/payment-history/PaymentHistoryListItem.tsx`
- `plan.md`, `NOTES.md`, `README-DONE.md`

**Modified:**
- `libs/core/src/index.ts`
- `libs/api/src/index.ts`
- `libs/api-controller/src/index.ts`
- `libs/ui-logic/src/index.ts`
- `libs/ui-api-interaction/src/index.ts`
- `libs/components/src/index.ts` (no change needed — `PaymentHistoryScreenView` already exported)
- `libs/language/src/paymentHistoryStrings.ts`
- Workspace tsconfig files (via `nx sync`)

**Unchanged (thin shells, verified compiling):**
- `apps/web/src/app/dashboard/account/payment-history/page.tsx`
- `apps/app/src/app/screen/you/payment-history/PaymentHistoryScreen.tsx`

