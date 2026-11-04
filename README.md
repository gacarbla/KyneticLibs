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
| [`@kyneticweb/container`](./packages/container) | Basic, strict and dynamic typed containers. |
| [`@kyneticweb/core`](./packages/core) | Composes the libraries into one fully typed object. |
| [`@kyneticweb/counter`](./packages/counter) | Predictable counter with explicit operations. |
| [`@kyneticweb/parser`](./packages/parser) | Conversions between strings, numbers, dates, JSON, YAML and words. |
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
