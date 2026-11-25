# Technical interview 2026: Payment history

Welcome, and thanks for taking the time to do this exercise.

This repository is a cut-down version of a real app. It's an Nx monorepo with a **web app** (Next.js with React Native Web) and a **native app** (Expo / React Native), sharing 23 libraries. Most of the code has been stripped out, but the structure, the layering rules and a few working screens are still there.

Your task is to build the **Payment history** screen.

## Getting started

You'll need **Node 22** and **npm 11**.

```sh
npm i
npx nx dev web
```

Then open <http://localhost:3000>. You'll land on the **Account** page, which shows a test subscriber with links to **Email address** and **Payment history**.

There's no backend and no sign-in. Every API request is answered by an in-memory **mock API** in [`libs/dev-tools`](libs/dev-tools/src/mock-api). Its data resets when you reload the page.

### Native app (optional)

The native app runs the same screens. It needs a local development build (Xcode or Android Studio):

```sh
npx nx run-ios app      # or: npx nx run-android app
```

Building for web only is fine. If you skip native, say so, and tell us anything you'd expect to differ on a phone.

## The task

Build the **Payment history** screen so that it shows the subscriber's payments.

It should:

1. **Show the payments, newest first.** For each one, show its description, amount, date and status.
2. **Paginate.** Load the first page, then load more as the user scrolls. Don't load everything up front.
3. **Support pull-to-refresh** in the native app. On web, decide what "refresh" should mean and tell us why.
4. **Handle every state:** loading, empty, failure on first load, and failure while loading more. The user should always be able to retry.
5. **Share the code.** Web and native should use the same screen code from the shared libraries. Only add platform-specific code where you need it.
6. **Follow the project's layering** (see [Project structure](#project-structure)).

### The API

```
GET /subscriber/payment?page=0&size=20&sort=paymentDate,desc
```

- `page` is zero-based. `size` and `sort` are optional.
- The response is a plain array of `Payment` objects, with no total count and no "next page" link.
- The `Payment` type and the generated client method `subscriber.subscriberPaymentGet(...)` are in [`libs/dx-api/src/dx-api.ts`](libs/dx-api/src/dx-api.ts).

### Testing other scenarios

Set `NEXT_PUBLIC_MOCK_API_SCENARIO` (web) or `EXPO_PUBLIC_MOCK_API_SCENARIO` (native) to make the mock API misbehave:

| Scenario          | What happens                                                 |
| ----------------- | ------------------------------------------------------------ |
| `default`         | Everything works. The subscriber has 100 payments.           |
| `empty`           | The subscriber has no payments.                              |
| `error`           | The first request for the list fails; retrying works.        |
| `next-page-error` | The first request for each later page fails; retrying works. |

For example:

```sh
NEXT_PUBLIC_MOCK_API_SCENARIO=next-page-error npx nx dev web
```

Each refresh of the first page adds a new payment at the top of the list, so you can see a refresh take effect.

## Where to start

The Payment history screen is already wired into both apps but renders nothing yet:

- **Shared screen:** [`libs/components/src/payment-history/PaymentHistoryScreenView.tsx`](libs/components/src/payment-history/PaymentHistoryScreenView.tsx)
- **Web page:** [`apps/web/src/app/dashboard/account/payment-history/page.tsx`](apps/web/src/app/dashboard/account/payment-history/page.tsx)
- **Native screen:** [`apps/app/src/app/screen/you/payment-history/PaymentHistoryScreen.tsx`](apps/app/src/app/screen/you/payment-history/PaymentHistoryScreen.tsx)

The **Email address** feature is a complete example of a screen that loads and saves data through every layer. It's a good guide to where each piece of your code should go:

| Layer                | Email address example                                        |
| -------------------- | ------------------------------------------------------------ |
| `dx-api`             | `Subscriber`, `EditSubscriber` types                         |
| `core`               | `mapper/subscriberResponseMapper.ts`, `model/user.ts`        |
| `api`                | `user/subscriber.ts`, `user/subscriberEdit.ts` (React Query) |
| `api-controller`     | `user/userDetails.ts`, `user/editUserEmail.ts`               |
| `ui-logic`           | `profile/changeEmailValidation.ts`, `profile/userData.ts`    |
| `ui-api-interaction` | `account-settings/changeEmailApiInteraction.ts`              |
| `components`         | `accountSettings/ChangeEmailScreenView.tsx`                  |

Some building blocks you might find useful:

- **List controls** in `libs/controls`: `SmartyFlatList` and the action list items.
- **Native list wrapper:** [`StackRootFlatList`](apps/app/src/app/component/common/StackRootFlatList.tsx), a stack-screen list that already supports `onRefresh`.
- **Design tokens:** `libs/design-tokens`, used through class names such as `smarty-px-l` and `text-foreground-primary`.

You're free to add new files, hooks, controls and strings wherever they belong.

## Project structure

```
apps/
  web/        Next.js app (react-native-web)
  app/        Expo / React Native app
libs/
  components, controls, controls-basic, assets    UI
  ui-api-interaction                              bridge between UI and data
  ui-navigation, ui-logic, ui-state               UI logic and state
  api-controller, api, store, core, dx-api        data
  analytics, util-generic, design-tokens, language  foundation
  dev-tools                                       mock API (apps only)
```

The rules, enforced by ESLint:

- **Imports point inward,** towards the foundation libraries, or sideways within the same layer. In the data layer the order is `api-controller → api → store → core → dx-api`.
- **UI libraries** (tagged `scope:shared`) may only depend on other `scope:shared` libraries and on `api-controller`. They never import `api` directly.
- **Import through the barrel.** Each library exposes a single `src/index.ts`; never import another library by file path.

## Before you submit

Run the same checks as CI. They should pass with **no errors and no warnings**:

```sh
npx nx run-many -t typecheck lint
```

Then check your screen in the browser with each mock scenario.

## Submitting

1. **Create your own private copy.** Click **Use this template → Create a new repository** on GitHub and choose **Private**. Don't fork the repository: forks are public.
2. **Commit as you go.** Your commit history helps us follow how you approached the task.
3. **Share it with us.** Add **`ricardosousaDev`** as a collaborator and send us the link.
4. **Add a short note** (a `NOTES.md` is fine) covering any decisions or trade-offs you made, and anything you'd do with more time.

## What we'll look at

- **Architecture:** code in the right layer and good use of the shared libraries.
- **Behavior:** pagination, refresh, and how loading, empty and error states feel to use.
- **Code quality:** readability, naming, types, and passing CI checks.
- **Accessibility:** for example, how the list reads with a screen reader.
- **Communication:** your notes and commit history.

There's no single right answer. We're more interested in how you reason about the problem than in a pixel-perfect result. 
