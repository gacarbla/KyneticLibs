# Kynetic Web runtime — architecture

Status: **M1–M3 delivered** (reactivity, DOM runtime, compiler and a working example).
The long-term goal is a TypeScript-native replacement for React with a better developer
experience, not a clone.

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Reactivity | Signals with automatic dependency tracking | No dependency arrays, no stale closures, fine-grained updates |
| Rendering | Direct DOM bindings, no virtual DOM | A signal updates one text node or attribute, not a component tree |
| Syntax | TSX, compiled | Full tag/attribute/event typing and the familiar authoring experience |
| JSX runtime | Automatic (`jsxImportSource`) | Works with Vite 8 and TypeScript without injected imports |
| Component model | Function components that run once | State lives in signals; lifecycle is explicit (`onMount`, `onCleanup`) |
| SSR | Designed for from day one, implemented in M6 | Render code must not touch `document` during the design phase |

## Package graph

```
@kyneticweb/reactive     signals, computed, effects, batch, owners
└── @kyneticweb/dom      jsx runtime, elements, components, context, lifecycle
    ├── @kyneticweb/compiler   Babel + Vite plugin (dynamic expression thunks)
    └── (future) router, i18n, forms, ssr, test, devtools, ui
```

## Compiler contract

The compiler (`@kyneticweb/compiler`) runs before the JSX transform and wraps dynamic
expressions in zero-argument thunks. The DOM runtime executes each thunk inside an effect.

| Construct | Compiled as | Reason |
| --- | --- | --- |
| Intrinsic attribute expression | `attr: () => expr` | The runtime updates only that attribute |
| Intrinsic child expression | `child: () => expr` | The runtime updates only that node |
| Event handler, `ref`, `key` | Eager | Handlers are not reactive values |
| Component attribute | Eager | Pass an accessor (`each={items}`) for reactive props |
| Component child | Thunk | Providers resolve children inside their context |
| Spread attribute | Compile error | Not supported yet; avoids silent eager reads |

Example:

```tsx
const count = createSignal(0);
<button onClick={() => count.update((n) => n + 1)}>count is {count()}</button>;
```

```js
// What the compiler produces (then esbuild/oxc emits the jsx() call)
jsx("button", { onClick: () => count.update((n) => n + 1) }, () => `count is ${count()}`);
```

## Runtime contract

- `jsx(type, props, ...children)` and the automatic runtime (`jsx`, `jsxs`, `Fragment`) share
  one node factory.
- Elements: attributes support `class` (string/array/map), `style` (text/object), boolean
  attributes, DOM properties (`value`, `checked`, `disabled`, ...), events and `ref`.
- Dynamic children use a comment anchor, so updates can replace content without recreating
  the parent.
- Components execute once inside a `createRoot`; their effects and cleanups are disposed with
  the parent. `onMount` runs after insertion (microtask) and is skipped if disposed first.
- Context is synchronous: `Context.Provider` resolves its children while the value is on the
  stack. Pass a signal/accessor as `value` when the value must change at runtime.
- `render(component, container)` returns a disposer that clears the container and releases
  every effect.

## Current limitations

- No keyed `<For>`/`<Show>` yet: use `.map()` and conditional expressions.
- Component attributes are eager; reactive props need an accessor.
- Spread attributes are rejected by the compiler.
- No portals, error boundaries, suspense or hydration yet (M4–M6).
- Context values are not reactive unless they are accessors.
- SVG elements are created with the HTML namespace.

## Roadmap

| Milestone | Scope |
| --- | --- |
| M4 | `For`/`Show` with per-item owners, portals, error boundaries, lazy components |
| M5 | Router, i18n, forms (reusing `@kyneticweb/parser`) |
| M6 | `renderToString`, hydration, streaming |
| M7 | Test renderer, devtools, component library |
| M8 | Benchmarks against React/Solid/Svelte and 1.0 |
