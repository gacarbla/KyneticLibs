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

Lists and conditionals are ordinary expressions; the compiler wraps them in a single effect.

```tsx
<ul>
    {items().map((item) => (
        <li>{item.text}</li>
    ))}
</ul>;

{
    pending() === 0 ? <p>Everything done.</p> : <p>{pending()} pending</p>;
}
```

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

Context is synchronous: read it in the component body. Pass a signal as `value` when it must
change at runtime.

## Lifecycle

```tsx
import { onMount, onCleanup } from "@kyneticweb/dom";

function Widget() {
    onMount(() => console.log("inserted"));
    onCleanup(() => console.log("removed"));
    return <div />;
}
```

## API

| Export | Description |
| --- | --- |
| `jsx`, `Fragment` | Classic JSX factories. |
| `render(component, container)` | Mounts a tree; returns a disposer. |
| `createContext`, `Context`, `useContext` | Synchronous context. |
| `onMount`, `onCleanup` | Post-insertion hook and cleanup registration. |
| `createSignal`, `createComputed`, `createEffect`, `batch`, `untrack`, `createRoot` | Re-exported from `@kyneticweb/reactive`. |

## Limitations (0.1)

- No keyed `For`/`Show` yet; use `.map()` and conditionals.
- Component props are eager; use accessors for reactive values.
- No portals, error boundaries, suspense or SSR yet.
- SVG elements use the HTML namespace.

See [docs/architecture.md](../../docs/architecture.md) for the compiler contract.

## License

Custom Non-Commercial License. See [LICENSE.md](./LICENSE.md).
