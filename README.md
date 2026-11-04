# Kynetic Web Libraries

An ESM-only monorepo with small, strongly typed TypeScript libraries. Every package ships
declaration files and declaration maps, so editors get full autocompletion and go-to-definition
without extra setup.

## Requirements

- Node.js **20 or newer**
- npm 9 or newer

## Packages

| Package | Description |
| --- | --- |
| [`@kyneticweb/console`](./packages/console) | Coloured logging, file persistence and an optional terminal UI. |
| [`@kyneticweb/compiler`](./packages/compiler) | JSX compiler for the Kynetic DOM runtime (Babel + Vite). |
| [`@kyneticweb/container`](./packages/container) | Basic, strict and dynamic typed containers. |
| [`@kyneticweb/core`](./packages/core) | Composes the libraries into one fully typed object. |
| [`@kyneticweb/counter`](./packages/counter) | Predictable counter with explicit operations. |
| [`@kyneticweb/dom`](./packages/dom) | Fine-grained DOM renderer with typed TSX, components and context. |
| [`@kyneticweb/forms`](./packages/forms) | Typed form state, validation and accessible fields. |
| [`@kyneticweb/i18n`](./packages/i18n) | Typed messages, plurals and locale formatting. |
| [`@kyneticweb/parser`](./packages/parser) | Conversions between strings, numbers, dates, JSON, YAML and words. |
| [`@kyneticweb/reactive`](./packages/reactive) | Signals, computed values, effects and ownership scopes. |
| [`@kyneticweb/router`](./packages/router) | Typed routing with path, hash and memory strategies. |
| [`@kyneticweb/ssr`](./packages/ssr) | Server-side rendering without a DOM. |
| [`@kyneticweb/utils`](./packages/utils) | Date formatting, text wrapping and identifier helpers. |
| [`@kyneticweb/versions`](./packages/versions) | Schema driven version parsing, validation and comparison. |

Install only what you need:

```bash
npm install @kyneticweb/core @kyneticweb/console @kyneticweb/parser
```

## Quick start

```ts
import { KyneticLibCore } from "@kyneticweb/core";
import { ConsoleManager } from "@kyneticweb/console";
import { StrictContainer } from "@kyneticweb/container";

interface AppContext {
    user: string;
    retries: number;
}

const core = new KyneticLibCore()
    .use("log", new ConsoleManager())
    .use("store", new StrictContainer<AppContext>());

core.console.log("ready");
core.tool.store.set("user", "gabriel");

const retries = core.tool.store.get("retries"); // number | undefined
```

Every package is ES modules only:

```ts
import { Parser } from "@kyneticweb/parser";
```

CommonJS `require()` is not supported.

## Web runtime

The monorepo also ships the first vertical slice of a TypeScript-native UI runtime:

- `@kyneticweb/reactive` — signals, computed values and effects with automatic tracking.
- `@kyneticweb/dom` — direct DOM bindings, function components, context and lifecycle.
- `@kyneticweb/router` — typed routes, guards, lazy views and navigation links.
- `@kyneticweb/i18n` — typed messages, plurals and locale formatting.
- `@kyneticweb/forms` — typed form state, validation and accessible fields.
- `@kyneticweb/ssr` — server rendering and hydration without a DOM.
- `@kyneticweb/compiler` — compiles TSX so each dynamic expression updates on its own.

```bash
npm install
npm run build
npm run dev:example   # http://localhost:5173
```

The example lives in [`examples/counter`](./examples/counter): counter, computed value, todo
list with controlled input, context and a theme effect. The design and the current
limitations are documented in [`docs/architecture.md`](./docs/architecture.md); the optional
Rust/Node-API policy is in [`docs/native.md`](./docs/native.md).

A side-by-side benchmark against React 19 lives in [`examples/benchmark`](./examples/benchmark):

```bash
npm run build:benchmark
npx vite preview --config examples/benchmark/vite.config.ts examples/benchmark
```

## Development

```bash
npm install      # install every workspace dependency
npm run build    # TypeScript project references
npm test         # Vitest
npm run lint     # ESLint
npm run format   # Prettier
npm run smoke    # verify every package resolves as ESM and packs cleanly
```

### Repository layout

```
packages/     one folder per published package
scripts/      build, cleaning and packaging helpers
.changeset/   release management
```

### Releasing

```bash
npx changeset          # describe the change
npm run version        # apply the version bump
npm run release        # build and publish
```

## License

Custom Non-Commercial License. See [LICENSE.md](./LICENSE.md).
