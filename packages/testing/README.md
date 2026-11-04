# `@kyneticweb/testing`

Testing helpers for `@kyneticweb/dom`: mount a component, query by text or selector, dispatch
user events and wait for reactive updates.

## Installation

```bash
npm install -D @kyneticweb/testing happy-dom
```

The package needs a DOM. `happy-dom` and `jsdom` both work; the examples below use Vitest
with the `happy-dom` environment.

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "happy-dom",
    },
});
```

## Usage

```tsx
import { cleanup, render, waitFor } from "@kyneticweb/testing";
import { afterEach, expect, it } from "vitest";
import { createSignal } from "@kyneticweb/dom";

afterEach(cleanup);

it("increments the counter", async () => {
    const count = createSignal(0);
    const app = render(() => (
        <button onClick={() => count.update((value) => value + 1)}>{() => `count: ${count()}`}</button>
    ));

    app.click("button");
    await app.flush();

    expect(app.getByText("count: 1")).toBeDefined();
});
```

`render` mounts into a fresh `div` appended to `document.body`; `dispose()` (or `cleanup`)
unmounts it and removes the container. Pass `{ container }` to mount into an element you own.

## Queries

```ts
app.find(".item");            // first match or null
app.findAll("li");            // every match
app.getByText("Save");        // deepest element whose text matches; throws when missing
app.queryByText(/^Save/);     // same, but returns null
app.queryAllByText("Save");   // every match, including ancestors
```

Text is normalized (whitespace collapsed, ends trimmed). A string matches exactly; a regular
expression is tested against the normalized text.

## Actions

```ts
app.click("button");                 // dispatches click
app.input("input", "hello");         // writes value + dispatches input
app.change("select", "es");          // writes value + dispatches change
app.check("input[type=checkbox]");   // sets checked + dispatches change
app.submit("form");                  // dispatches submit
app.keyDown("input", "Enter");       // dispatches keydown
await app.flush();                   // lets the scheduler commit effects
```

Events are dispatched directly, so anchors do not navigate and tests stay deterministic. Use
`fireEvent` when you already have an element:

```ts
import { fireEvent } from "@kyneticweb/testing";

fireEvent.click(app.find(".item")!);
fireEvent.input(app.find("input")!, "hello");
```

## Waiting

`flush()` covers the common case (the scheduler runs in a microtask). For timers, dynamic
imports or other asynchronous work, use `waitFor`:

```ts
await waitFor(() => app.queryByText("Saved"), { timeout: 500, interval: 10 });
```

`waitFor` retries until the callback returns something other than `false`, `null` or
`undefined`, and throws the last error when the timeout expires.

## API

| Export | Description |
| --- | --- |
| `render(component, options?)` | Mounts a tree and returns `TestApp`. |
| `cleanup()` | Unmounts every app created by `render`. |
| `flush()` | Waits for the reactive scheduler. |
| `waitFor(callback, options?)` | Retries until the callback succeeds. |
| `fireEvent` | `click`, `input`, `change`, `check`, `submit`, `keyDown`. |

`TestApp` exposes `container`, `dispose`, `html`, `text`, `find`, `findAll`, `getByText`,
`queryByText`, `queryAllByText`, `click`, `input`, `change`, `check`, `submit`, `keyDown` and
`flush`.

## Notes

- Call `cleanup()` from `afterEach`; otherwise containers accumulate between tests.
- Effects that throw after mount are reported through `setErrorHandler`; set a handler if a
  test needs to assert them.

## License

Custom Non-Commercial License. See [LICENSE.md](./LICENSE.md).
