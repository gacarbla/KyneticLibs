# SSR example

A complete server-rendering example that uses the router, `i18n` and `forms`
packages, with hydration on the client.

## Run it

```bash
npm run build        # packages
npm run build:ssr    # client bundle + server bundle
npm run start:ssr    # http://localhost:4173
```

Routes:

- `/` — counter, hydration badge and locale switcher.
- `/about` — lazily loaded route (`import()`), awaited by `renderToStringAsync`.
- `/contact` — validated form whose fields update through signals.

## How it works

1. The Node server reads `dist/client/index.html` once.
2. For each request it creates a **new** router (`createMemoryStrategy(url)`) and
   a **new** i18n instance, so no state leaks between requests.
3. `renderToStringAsync` renders the tree. Lazy routes become pending nodes: the
   server emits the loading view, waits for `import()`, and renders again.
4. The HTML replaces `<!--app-->` in the template.
5. The browser starts the router with `createPathStrategy()` **before**
   hydrating, so `RouterView` resolves the same route the server used and adopts
   its DOM instead of rebuilding it.

```tsx
// src/client.tsx
router.start();
hydrate(() => createApp(router, i18n), container);
```

## What is adopted

- Elements, static attributes and text.
- Dynamic text and attribute thunks (counter, locale switch, form values).
- Context providers (i18n) and `RouterView` with eager routes.
- Keyed list rows (`<For>`) and conditional branches (`<Show>`), adopted in place.
- Event handlers and `ref` callbacks, attached to the adopted elements.
- `onMount` callbacks, which run once the adopted tree is live.

`<For>` and `<Show>` are hydrated in place too: the server wraps them in comment markers, the
client adopts the existing rows or branch, and the normal reconciler takes over from there.
The demo uses both (conditional success view, facts list).

## Production notes

- `dist/client` must be deployed next to `dist/server`.
- `src/server.tsx` serves only `/assets/*`; put other static files behind a CDN
  or extend `serveAsset`.
- The server sets `PORT` (default `4173`).
