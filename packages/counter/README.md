# `@kyneticweb/counter`

A small, predictable counter with explicit operations.

## Installation

```bash
npm install @kyneticweb/counter
```

## Usage

```ts
import { Counter } from "@kyneticweb/counter";

const counter = new Counter(10);

counter.increment();        // 11
counter.increment(5);       // 16
counter.decrement(2);       // 14
counter.value;              // 14

counter.set(100).increment();
counter.reset();            // back to 10, the constructor value
```

Every mutating method returns the instance, so calls can be chained. Invalid input
(`NaN`, `Infinity`) throws a `RangeError` instead of silently corrupting the value.

## API

| Member | Description |
| --- | --- |
| `new Counter(initialValue?)` | Creates a counter (default `0`). |
| `value` | Current value. |
| `increment(step?)` | Adds `step` (default `1`). |
| `decrement(step?)` | Subtracts `step` (default `1`). |
| `set(value)` | Replaces the current value. |
| `reset()` | Restores the constructor value. |
| `toString()` | Current value as text. |
| `next` / `previous` | **Deprecated**: increment/decrement getters. |

The instance exposes `toolKind = "counter"`, so `@kyneticweb/core` makes it available as
`core.counter`.

## License

Custom Non-Commercial License. See [LICENSE.md](./LICENSE.md).
