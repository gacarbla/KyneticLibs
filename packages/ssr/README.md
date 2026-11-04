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
import { renderToString } from "@kyneticweb/ssr";

const html = renderToString(() => <App />, { doctype: true });
response.end(html);
```

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

## Limitations

- Hydration adopts elements, components, dynamic text/attributes and context. Collections,
  conditionals, portals and error boundaries currently fall back to a client render of the
  root (correct, but those nodes are recreated).
- Lazy routes and effect-driven views (for example `RouterView`) do not render on the server
  yet; they need Suspense-style async rendering.
- Do not return real DOM nodes from a component while rendering on the server.

## License

Custom Non-Commercial License. See [LICENSE.md](./LICENSE.md).
