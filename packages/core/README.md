# `@kyneticweb/core`

Composes the Kynetic libraries into a single, fully typed object.

`KyneticLibCore` does not inspect constructors: a tool declares an optional `toolKind`, and the
core uses it to expose the instance both through `core.tool.<alias>` and as a direct property
(`core.console`, `core.container`, ...). This keeps composition safe even when `node_modules`
contains duplicated copies of a package.

## Installation

```bash
npm install @kyneticweb/core
```

## Usage

```ts
import { KyneticLibCore } from "@kyneticweb/core";
import { ConsoleManager } from "@kyneticweb/console";
import { StrictContainer } from "@kyneticweb/container";
import { Counter } from "@kyneticweb/counter";
import { Parser } from "@kyneticweb/parser";
import { VersionManager } from "@kyneticweb/versions";

interface AppContext {
    user: string;
    attempts: number;
}

const core = new KyneticLibCore()
    .use("log", new ConsoleManager())
    .use("store", new StrictContainer<AppContext>())
    .use("attempts", new Counter())
    .use("text", new Parser())
    .use("version", new VersionManager());

core.console.log("application started");
core.tool.attempts.increment();
core.tool.store.set("user", "gabriel");
```

The language service knows each type: `core.tool.attempts` is a `Counter` and
`core.tool.text` is a `Parser`.

## API

### `new KyneticLibCore()`

Creates an empty composition root.

### `use(alias, tool)`

Registers a tool and returns the same instance, typed with the new alias. Registering the same
alias twice throws.

### `get(alias)`, `has(alias)`, `remove(alias)`

Explicit access without relying on the accumulated type.

### `tool`

Record of every registered tool, keyed by alias.

### `dispose()`

Calls `dispose()` (or `close()`) on every tool, then clears the registry. Failures are collected
in an `AggregateError`, so one broken tool does not prevent the rest from being released.

## Custom tools

```ts
import type { Tool } from "@kyneticweb/core";

class Clock implements Tool {
    public readonly toolKind = "clock" as const;

    public now(): Date {
        return new Date();
    }

    public dispose(): void {
        // nothing to release
    }
}

const core = new KyneticLibCore().use("clock", new Clock());
core.clock.now();
```

## License

Custom Non-Commercial License. See [LICENSE.md](./LICENSE.md).
