# `@kyneticweb/dom`

Fine-grained DOM renderer with typed TSX, function components, context and lifecycle hooks.
No virtual DOM: a signal updates the text node or attribute that read it.

## Installation

```bash
npm install @kyneticweb/dom
npm install -D @kyneticweb/compiler vite
```

## Vite setup

```ts
// vite.config.ts
import { defineConfig } from "vite";
import kynetic from "@kyneticweb/compiler/vite";

export default defineConfig({
    plugins: [kynetic()],
});
```

```json
// tsconfig.json
{
    "compilerOptions": {
        "jsx": "react-jsx",
        "jsxImportSource": "@kyneticweb/dom"
    }
}
```

## First component

```tsx
import { createSignal, render } from "@kyneticweb/dom";

function Counter() {
    const count = createSignal(0);

    return (
        <button onClick={() => count.update((value) => value + 1)}>
            count is {count()}
        </button>
    );
}

render(() => <Counter />, document.getElementById("app")!);
```

The component body runs once. `{count()}` is compiled into a thunk that the runtime executes
inside an effect, so only that text node changes.

## Components and props

Props are passed eagerly; pass an accessor when the child must react to changes.

```tsx
interface TodoProps {
    readonly text: string;
    readonly done: boolean;
    readonly onToggle: () => void;
}

function Todo({ text, done, onToggle }: TodoProps) {
    return (
        <li class={done ? "done" : ""}>
            <input type="checkbox" checked={done} onChange={onToggle} />
            {text}
        </li>
    );
}
```

## Lists and conditionals

Lists and conditionals have dedicated components with per-item ownership:

```tsx
<ul>
    <For each={items} keyBy={(item) => item.id} fallback={<p>Nothing yet.</p>}>
        {(item) => <li>{item.text}</li>}
    </For>
</ul>

<Show when={() => pending() === 0} fallback={<p>{pending()} pending</p>}>
    <p>Everything done.</p>
</Show>
```

`each` and `when` accept an accessor (a signal or computed) or a plain value. A new item
object under the same key updates the existing row through a shallow proxy, so its DOM nodes
and focus survive; only top-level properties are reactive.

## Portals and error boundaries

```tsx
<Portal mount={document.body}>
    <div class="modal">...</div>
</Portal>

<ErrorBoundary fallback={(error) => <p>{error.message}</p>}>
    <RiskyWidget />
</ErrorBoundary>
```

`Portal` moves content to another element and cleans it up when the owner is disposed.
`ErrorBoundary` catches errors thrown while mounting or re-rendering children; pass `reset`
to retry.


## Context

```tsx
import { createContext, useContext } from "@kyneticweb/dom";

const Theme = createContext("light");

function Panel() {
    const theme = useContext(Theme);
    return <div class={theme}>...</div>;
}

<Theme.Provider value="dark">
    <Panel />
</Theme.Provider>;
```

Context is read in the component body. The provider also attaches the value to an owner
scope, so effects, list rows and deferred components created later keep reading it. Pass a
signal as `value` when it must change at runtime.

## Lifecycle

```tsx
import { onMount, onCleanup } from "@kyneticweb/dom";

function Widget() {
    onMount(() => console.log("inserted"));
    onCleanup(() => console.log("removed"));
    return <div />;
}
```

`onMount` runs once the tree is in the DOM. During server rendering it is skipped; during
hydration it runs after the adopted nodes are live.

## Hydration

```tsx
import { hydrate } from "@kyneticweb/dom";

hydrate(() => <App />, document.getElementById("app")!);
```

The server markup produced by `@kyneticweb/ssr` is adopted in place: elements, components,
fragments, dynamic text/attributes, context providers, event handlers and `ref` callbacks
keep their DOM nodes and only attach bindings. Collections, conditionals, portals and error
boundaries fall back to a client render of the root, which is correct but recreates those
nodes.

A universal node kept from a server or hydration pass can be inserted later: `toNodes`
materializes it into real DOM instead of stringifying it.

## API

| Export | Description |
| --- | --- |
| `jsx`, `Fragment` | Classic JSX factories. |
| `render(component, container)` | Mounts a tree; returns a disposer. |
| `hydrate(component, container)` | Adopts server markup and attaches bindings. |
| `createPending(promise, fallback)` | Async boundary for `renderToStringAsync`. |
| `For`, `Show` | Keyed collections and conditional branches with per-item owners. |
| `Portal`, `ErrorBoundary` | Overlays and render error isolation. |
| `createContext`, `Context`, `useContext` | Owner-scoped context. |
| `onMount`, `onCleanup` | Post-insertion hook and cleanup registration. |
| `createSignal`, `createComputed`, `createEffect`, `batch`, `untrack`, `createRoot` | Re-exported from `@kyneticweb/reactive`. |

## Limitations (0.1)

- `hydrate` falls back to a client render for collections, conditionals, portals and boundaries.
- Lazy routes need `router.preload()` before hydration to avoid showing the loading view.
- `For` updates a row in place when the item object changes under the same key; only
  top-level properties are reactive, so nested mutations need a new object or an accessor.
- Component props are eager; use accessors for reactive values.
- SVG elements use the SVG namespace; `<foreignObject>` children are an edge case still to cover.

See [docs/architecture.md](../../docs/architecture.md) for the compiler contract.

## License

Custom Non-Commercial License. See [LICENSE.md](./LICENSE.md).
