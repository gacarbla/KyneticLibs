# `@kyneticweb/reactive`

Fine-grained reactivity for the Kynetic web runtime. Signals, computed values, effects,
batching and ownership scopes, with automatic dependency tracking and no dependency arrays.

## Installation

```bash
npm install @kyneticweb/reactive
```

## Signals

```ts
import { createSignal } from "@kyneticweb/reactive";

const count = createSignal(0);

count();                        // 0
count.set(2);                   // 2
count.update((value) => value + 1); // 3
count.peek();                   // 3, without subscribing
```

A signal is a callable accessor. `set` accepts a value or a function that derives the next
value. Equal values do not notify (`Object.is` by default, configurable with `equals`).

## Computed values

```ts
import { createComputed } from "@kyneticweb/reactive";

const doubled = createComputed(() => count() * 2);
doubled(); // 6
```

Dependencies are whatever the function reads while it runs; they are re-collected on every
recomputation, so conditional branches work without extra configuration.

## Effects

```ts
import { createEffect, onCleanup } from "@kyneticweb/reactive";

const stop = createEffect(() => {
    console.log("count is", count());
    onCleanup(() => console.log("cleaning up"));
});

stop(); // releases the effect
```

Effects run immediately. Later runs are batched in a microtask, so several writes produce a
single re-execution. A cleanup function can also be returned from the body.

## Batching and untracking

```ts
import { batch, untrack } from "@kyneticweb/reactive";

batch(() => {
    first.set(1);
    second.set(2);
}); // dependent effects run once

createEffect(() => {
    const tracked = count();          // dependency
    const ignored = untrack(() => other()); // not a dependency
});
```

## Ownership

`createRoot` groups effects and cleanups. Disposing the root releases everything created
inside, including nested roots.

```ts
import { createRoot, createEffect, onCleanup } from "@kyneticweb/reactive";

const dispose = createRoot((release) => {
    createEffect(() => console.log(count()));
    onCleanup(() => console.log("root disposed"));
    return release;
});

dispose();
```

## API

| Export | Description |
| --- | --- |
| `createSignal(initial, options?)` | Observable value with `set`, `update`, `peek`. |
| `createComputed(fn)` | Lazily cached derived value with `peek` and `dispose`. |
| `createEffect(fn)` | Runs now and whenever a dependency changes. Returns a disposer. |
| `createRoot(fn)` | Ownership scope; `fn` receives the disposer. |
| `batch(fn)` | Groups writes so effects run once. |
| `untrack(fn)` | Reads without subscribing the running computation. |
| `onCleanup(fn)` | Registers a cleanup for the running effect or owner. |
| `setErrorHandler(fn)` | Replaces the handler for errors thrown by scheduled effects. |

## License

Custom Non-Commercial License. See [LICENSE.md](./LICENSE.md).
