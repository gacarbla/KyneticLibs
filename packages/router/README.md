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

## Notes

- Routes are matched in insertion order: put catch-all (`*`) routes last.
- `RouterView` disposes the previous view when the route changes and cancels pending lazy
  loads.
- `Link` keeps native behaviour for modified clicks (Ctrl/Meta/Shift/middle button).
- `start()` returns a disposer and can be called again after `stop()`.

## License

Custom Non-Commercial License. See [LICENSE.md](./LICENSE.md).
