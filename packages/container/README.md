# `@kyneticweb/container`

Typed containers for dependency injection and shared application state.

Three implementations, one contract: a `Map` behind a small, strongly typed API.

## Installation

```bash
npm install @kyneticweb/container
```

## `StrictContainer`

Every key has its own value type, checked by the compiler.

```ts
import { StrictContainer } from "@kyneticweb/container";

interface Settings {
    theme: string;
    compact: boolean;
}

const settings = new StrictContainer<Settings>({ theme: "dark" });

settings.set("compact", true);        // ok
settings.set("compact", "yes");       // compile error
settings.getOrThrow("theme");         // string
settings.get("missing");              // compile error
```

## `BasicContainer`

Free-form string keys, one value type.

```ts
import { BasicContainer } from "@kyneticweb/container";

const scores = new BasicContainer<number>({ alice: 10 });
scores.set("bob", 8).set("carol", 12);
scores.values(); // [10, 8, 12]
```

## `DynamicContainer`

The key shape grows while the program runs. `addKey` and `withValue` are immutable:
they return a new container whose type includes the new key.

```ts
import { DynamicContainer } from "@kyneticweb/container";

const base = new DynamicContainer();
const withCount = base.withValue("count", 3);

withCount.getOrThrow("count"); // 3 (typed as number)
base.has("count");             // false
```

## Shared API

| Member | Description |
| --- | --- |
| `set(key, value)` | Stores a value and returns `this`. |
| `get(key)` | Value or `undefined`. |
| `getOrThrow(key)` | Value, or throws when the key is absent. |
| `has(key)` | Whether the key is present. |
| `delete(key)` / `clear()` | Removes one entry or everything. |
| `size` | Number of stored entries. |
| `keys()` / `values()` / `entries()` | Snapshots in insertion order. |
| `clone()` | Independent copy. |
| `toJSON()` | Plain object copy. |

Containers also expose `toolKind = "container"`, which `@kyneticweb/core` uses to make the
instance available as `core.container`.

## License

Custom Non-Commercial License. See [LICENSE.md](./LICENSE.md).
