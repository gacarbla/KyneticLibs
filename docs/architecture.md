# Kynetic Web runtime — architecture

Status: **M1–M5 delivered**; **M6 in progress** (server rendering and basic hydration done,
async rendering and full list hydration next).
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
    ├── @kyneticweb/router     typed routes, guards, lazy views, links
    ├── @kyneticweb/i18n       typed messages, plurals, locale formatting
    ├── @kyneticweb/forms      typed form state, validation, accessible fields
    ├── @kyneticweb/ssr        server rendering without a DOM
    ├── @kyneticweb/compiler   Babel + Vite plugin (dynamic expression thunks)
    └── (future) test, devtools, ui
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
| Spread attribute | Allowed; eager unless values are thunks | Form bindings pass thunks for reactive values |

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
  one node factory. Both switch to the universal tree while a server or hydration pass is
  active, so TSX and manual `jsx()` calls behave the same.
- Elements: attributes support `class` (string/array/map), `style` (text/object), boolean
  attributes, DOM properties (`value`, `checked`, `disabled`, ...), events and `ref`.
- Dynamic children use a comment anchor, so updates can replace content without recreating
  the parent.
- Components execute once inside a `createRoot`; their effects and cleanups are disposed with
  the parent. `onMount` runs after insertion (microtask) and is skipped if disposed first.
- Context is scope-based: `Context.Provider` stores the value on an owner that wraps its
  children, and effects, list rows and deferred components inherit it through the owner
  chain. Server rendering also pushes the value on a synchronous stack, so components resolve
  it during the same pass. Pass a signal/accessor as `value` when it must change at runtime.
- `render(component, container)` returns a disposer that clears the container and releases
  every effect.
- `hydrate(component, container)` rebuilds the node tree in hydration mode, adopts the
  existing DOM for elements/components/dynamic bindings/context/events/refs, keyed lists and
  conditionals, and falls back to a client render for portals, error boundaries and pending
  boundaries.
- Server output wraps `<For>` and `<Show>` in comment markers (`k:for`, `k:when`). Hydration
  uses their nesting to find each region, adopts the rows or the active branch, and seeds the
  normal reconciler so later updates stay keyed.
- `renderToStringAsync(component)` collects the promises registered by `createPending` nodes,
  awaits them and renders again (up to 10 passes). The component behind a pending boundary
  must cache its result so the later pass is synchronous.
- `renderToStream(component)` emits HTML chunks. It keeps provider values in an explicit
  environment and enables server mode only around synchronous user code, so no state leaks
  across `await` or between concurrent streams. A pending boundary with a `retry` resolves
  only its own subtree. With `outOfOrder: true` the fallback is emitted in place and the
  resolved content is patched by an inline script, so later content never waits.
- Dynamic slots own their content. Replacing one disposes the previous components and
  effects, and the slot moves its range start to the new first node, so repeated updates
  never duplicate nodes or leave detached effects running.

## Benchmark

`examples/benchmark` runs the same operations against this runtime and React 19 (production
build, `flushSync` for a synchronous React commit, forced layout included). Median of 15 runs
(5 rounds each) on a desktop machine, 1 000 rows; expect ±20–30 % run-to-run variance:

| Operation | Kynetic | React 19 | Ratio |
| --- | --- | --- | --- |
| create 1 000 | 17.5 ms | 18.6 ms | 1.06× |
| update one | 0.5 ms | 1.1 ms | 2.20× |
| update every 10th | 1.1 ms | 1.4 ms | 1.27× |
| replace all | 6.7 ms | 6.3 ms | 0.94× |
| reverse all | 12.1 ms | 13.6 ms | 1.12× |
| remove one | 9.5 ms | 12.1 ms | 1.27× |
| clear | 1.6 ms | 1.7 ms | 1.06× |

The first version of this benchmark was 2–3× slower. The current runtime reaches parity or
wins every operation after these changes:

- one observer slot per source instead of a `Set`, with a `Set` allocated only on the second
  observer;
- an array scheduler queue with a `scheduled` flag, so flushing needs no `Set` or copy;
- one effect per element, dynamic attributes skipped when their value is unchanged, and text
  updates that rewrite the existing text node;
- a key-order fast path in `For`: immutable updates with stable keys skip the map rebuild,
  the reorder walk and every DOM write;
- a shared proxy handler for list items (no per-item closures) and one range deletion for
  large contiguous removals such as clearing the list.

**Reading the numbers:** single-row updates and removals win clearly, bulk operations are at
parity, and creation is slightly ahead. Layout dominates the absolute times (a forced
`getBoundingClientRect` is roughly half of each measurement), which is why the no-layout
diagnostic still shows React ahead on creation. The clearest advantage remains bundle size:
the counter example (runtime + compiler output + app) is **~4.4 kB gzip**, against ~45 kB for
React + ReactDOM.

Next performance work: batch DOM writes inside a list update, compile static subtrees into
cloneable templates, and measure with the official `js-framework-benchmark` harness.

## Server rendering example

`examples/ssr` (run `npm run build:ssr && npm run start:ssr`) is the reference integration:

- one router per request with `createMemoryStrategy(url)` and one i18n instance per request;
- `renderToStringAsync` awaits lazy routes before responding;
- the client starts the path router and calls `router.preload()` before `hydrate`, so the
  first client render matches the server markup;
- hydration adopts the header, the counter, the locale switcher and the form, attaching input
  handlers and `onMount`;
- the contact form exercises validation, thunks for `value`/`disabled`, and a conditional
  success view.

## Current limitations

- `For` reuses a row when the item object changes under the same key: reads go through a
  shallow proxy, so the DOM and focus survive. Only top-level properties are reactive.
- Component attributes are eager; reactive props need an accessor.
- Spread attributes are allowed; values are eager unless they are already thunks (form
  bindings provide reactive thunks).
- Context values are not reactive unless they are accessors.
- Hydration adopts elements, components, bindings, context, events, refs, lists and
  conditionals. Portals, error boundaries and pending boundaries fall back to a client render.
- Lazy routes need `preload()` before hydration to avoid a loading flash.
- SVG elements are created with the SVG namespace, but `<foreignObject>` children remain SVG.

## Implemented (M1–M4)

- Signals, computed values, effects, batching, owners and cleanups.
- TSX compiler with fine-grained bindings and automatic runtime.
- Function components, context, refs, events (including capture), `onMount`/`onCleanup`.
- `<For>` with keyed reconciliation and per-item owners, `<Show>`, `<Portal>`, `<ErrorBoundary>`.
- SVG namespace, style property cleanup, boolean/DOM properties, `class` maps.

## Roadmap

| Milestone | Scope |
| --- | --- |
| M4 | `For`/`Show` with per-item owners, portals, error boundaries, lazy components — **delivered** |
| M5 | Router, i18n, forms (reusing `@kyneticweb/parser`) — **delivered** |
| M6 | `renderToString`, `renderToStringAsync`, in-order and out-of-order streaming, hydration of elements, context, lists and conditionals — **delivered** |
| M7 | Test renderer, devtools, component library |
| M8 | Benchmarks against React/Solid/Svelte and 1.0 |
