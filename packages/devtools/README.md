# `@kyneticweb/devtools`

Development panel for the Kynetic runtime: the live component tree and reactive activity
counters, isolated in a shadow root.

## Installation

```bash
npm install -D @kyneticweb/devtools
```

## Usage

Create the panel **before** rendering the application:

```ts
import { createDevtools } from "@kyneticweb/devtools";

if (import.meta.env.DEV) {
    createDevtools();
}
```

The panel sits in the bottom-right corner and can be collapsed. It shows:

| Counter | Meaning |
| --- | --- |
| `signals` | Signals created since the process started. |
| `memos` | Computed values created. |
| `effects` | Effects created. |
| `runs` | Effect executions. |
| `pending` | Effects waiting for the next flush. |
| `components` | Components currently mounted. |

Below the counters, the component tree lists every mounted component with its parent
nesting. Names come from `displayName` or the function name; anonymous components appear as
`Anonymous`.

```ts
const devtools = createDevtools({ interval: 250 });
// ...
devtools.dispose(); // removes the panel and restores the previous hook
```

## How it works

`@kyneticweb/dom` exposes `setDevtoolsHook`, a development hook that emits one event per
component mount and unmount. When no hook is installed, the runtime only checks a nullable
variable, so production pays almost nothing. The counter snapshot comes from
`getReactiveStats()` in `@kyneticweb/reactive`.

## Notes

- Create it before the components you want to inspect; components mounted earlier are not
  registered.
- Only one panel should be active at a time.
- Hydrated trees are not registered by the hook (hydration executes components directly). The
  tree covers components created after the panel is mounted, such as route views.
- The panel mounts into `document.body` by default; pass `{ container }` to place it
  elsewhere.

## API

| Export | Description |
| --- | --- |
| `createDevtools(options?)` | Mounts the panel; returns `{ element, dispose }`. |

`DevtoolsOptions`: `container` (host element) and `interval` (stats refresh in ms, default
500).

## License

Custom Non-Commercial License. See [LICENSE.md](./LICENSE.md).
