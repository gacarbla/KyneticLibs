# `@kyneticweb/compiler`

JSX compiler for `@kyneticweb/dom`. It wraps dynamic expressions in zero-argument thunks so
the runtime can execute each one inside its own effect.

It is a **pre-transform**: it does not compile JSX itself. Vite (oxc/esbuild) emits the
`jsx()` calls through the automatic runtime configured in `tsconfig.json`.

## Installation

```bash
npm install -D @kyneticweb/compiler
```

## Vite

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

## Babel

The plugin is also exported for custom pipelines:

```js
// babel.config.cjs
module.exports = {
    plugins: [require("@kyneticweb/compiler/babel")],
};
```

## Rules

| Construct | Result |
| --- | --- |
| Intrinsic attribute expression | Wrapped in `() => expr` |
| Intrinsic child expression | Wrapped in `() => expr` |
| `on*` handler, `ref`, `key` | Left eager |
| Component attribute | Left eager (pass an accessor for reactive props) |
| Component child | Wrapped so a provider resolves it inside its context |
| Arrow/function expression | Left as-is (render props) |
| Spread on a component | Allowed (props are eager) |
| Spread on an intrinsic element | Compile error: it would silently disable reactivity |

## Tests and benchmarks

`packages/dom/test` covers elements, reactivity, events, components, context, lifecycle,
`For`/`Show` with disposal, portals, error boundaries, SVG, style cleanup and capture events.

`examples/benchmark` compares the runtime with React 19. See `docs/architecture.md` for the
numbers and the methodology.

## License

Custom Non-Commercial License. See [LICENSE.md](./LICENSE.md).
