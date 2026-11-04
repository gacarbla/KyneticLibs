# `@kyneticweb/router`

Typed router for `@kyneticweb/dom`. Path templates infer their params, so `navigate` and
`href` are checked by the compiler.

## Installation

```bash
npm install @kyneticweb/router
```

## Setup

```tsx
import { createRouter, createPathStrategy, RouterProvider, RouterView, Link } from "@kyneticweb/router";

const router = createRouter({
    routes: {
        home: { path: "/", component: () => <Home /> },
        user: { path: "/users/:id", component: () => <User /> },
        settings: {
            path: "/settings",
            load: () => import("./settings.js"), // module with a default component
        },
    },
    strategy: createPathStrategy(),
    fallback: "home",
});

render(
    () => (
        <RouterProvider router={router}>
            <nav>
                <Link to="home">Home</Link>
                <Link to="user" params={{ id: "42" }}>User 42</Link>
            </nav>
            <RouterView fallback={<p>Not found</p>} loading={<p>Loading…</p>} />
        </RouterProvider>
    ),
    document.getElementById("app")!,
);

router.start();
```

## Strategies

| Factory | URL | Use case |
| --- | --- | --- |
| `createPathStrategy(base?)` | `/users/1` | Normal websites (History API). |
| `createHashStrategy()` | `#/users/1` | Static hosting without rewrites. |
| `createMemoryStrategy(initial?)` | never changes | Tests, embeds and SSR. |

## Typed navigation

```ts
router.navigate("user", { id: "42" });       // params required
router.navigate("settings", { replace: true }); // no params, options
router.href("user", { id: "42" });           // "/users/42"
```

Missing or unknown params are compile errors and `href` throws at runtime.

## Guards

```ts
const stop = router.beforeEach((to, from) => {
    if (to.name === "settings" && !isLoggedIn()) {
        return "home"; // redirect
    }
    return true;
});
```

Return `false` to cancel. Guards may redirect to a static route name; parameterized
redirects are not supported yet (throw a clear error).

## Server rendering

```tsx
import { renderToStringAsync } from "@kyneticweb/ssr";
import { createMemoryStrategy } from "@kyneticweb/router";

const router = createRouter({
    routes,
    strategy: createMemoryStrategy(request.url),
    fallback: "home",
});
router.start();

const html = await renderToStringAsync(() => <App router={router} />);
router.stop();
```

`RouterView` renders the matched route directly on the server. Lazy routes become pending
nodes that `renderToStringAsync` awaits. Create a router per request: the definitions can be
shared, but the route state must not.

Before hydrating, resolve the current lazy view:
 
```ts
router.start();               // reads the current URL
await router.preload();       // loads the active route, if it is lazy
hydrate(() => <App router={router} />, container);
```

`preload` is idempotent and caches the module per loader.

## Notes

- Routes are matched in insertion order: put catch-all (`*`) routes last.
- `RouterView` disposes the previous view when the route changes; a slow load that finishes
  after another navigation never replaces the current view.
- Route components and lazy views run inside the router's owner chain, so context providers
  above `RouterProvider` stay available after navigation.
- `Link` keeps native behaviour for modified clicks (Ctrl/Meta/Shift/middle button).
- `start()` returns a disposer and can be called again after `stop()`.

## License

Custom Non-Commercial License. See [LICENSE.md](./LICENSE.md).
