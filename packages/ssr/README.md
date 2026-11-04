# `@kyneticweb/ssr`

Server-side rendering for the Kynetic DOM runtime without a DOM.

The same components, `<For>`, `<Show>`, context and error boundaries used on the client run
here. `jsx` switches to a plain node tree, effects and `onMount` are skipped, and the tree is
serialized to HTML.

## Installation

```bash
npm install @kyneticweb/ssr
```

## Usage

```tsx
import { renderToString, renderToStringAsync } from "@kyneticweb/ssr";

// Static tree.
const html = renderToString(() => <App />, { doctype: true });

// Tree with lazy work (routes, data boundaries).
const asyncHtml = await renderToStringAsync(() => <App />, { doctype: true });
response.end(asyncHtml);
```

`renderToString` renders a pending boundary as its fallback. `renderToStringAsync` awaits
every pending promise and renders again, up to 10 passes.

## Async boundaries

```tsx
import { createPending } from "@kyneticweb/dom";

function Profile(props: { id: string }) {
    const user = cache.get(props.id);
    if (user !== undefined) {
        return <ProfileCard user={user} />;
    }
    return createPending(
        fetchUser(props.id).then((value) => cache.set(props.id, value)),
        <Spinner />,
    );
}
```

The promise must cache its result: the second pass renders synchronously. `RouterView` uses
this mechanism for lazy routes, and `router.preload()` resolves the current route before
hydration so the client's first render matches the server markup.

## Behaviour

- **No DOM required**: safe in Node, workers and serverless runtimes.
- **Escaping**: text and attribute values are escaped; `innerHTML` is inserted raw and must
  only receive trusted content.
- **Void elements** are emitted without a closing tag.
- **Attributes**: `class` maps/arrays, `style` objects, booleans, `data-*` and `aria-*` are
  serialized; event handlers, `ref` and `key` are dropped.
- **Context** is preserved while rendering provider children.
- **Error boundaries** catch render errors and emit the fallback.
- **`<Portal>`** renders its children inline on the server.
- **Effects and `onMount` are skipped**: keep DOM side effects there, not in the component
  body.
- **Automatic JSX runtime**: `jsxImportSource: "@kyneticweb/dom"` works on the server; every
  `jsx()` call produces universal nodes while a server or hydration pass is active.

## Hydration

```tsx
import { hydrate } from "@kyneticweb/dom";

hydrate(() => <App />, document.getElementById("app")!);
```

Adopted in place: elements, text, dynamic attributes, context providers, event handlers and
`ref` callbacks. `onMount` runs after the adopted tree is live.

## Limitations

- Collections, conditionals, portals and error boundaries currently fall back to a client
  render of the root (correct, but those nodes are recreated).
- Lazy routes need `router.preload()` (or `renderToStringAsync`) before hydration to avoid a
  loading flash.
- Do not return real DOM nodes from a component while rendering on the server.

## License

Custom Non-Commercial License. See [LICENSE.md](./LICENSE.md).
