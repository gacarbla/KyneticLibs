import "./jsx-types.js";
import { jsx } from "./jsx-runtime.js";
import type { Child, Props } from "./types.js";

/**
 * Development JSX runtime (`jsxImportSource` in development mode).
 *
 * Vite resolves this entry in dev; it forwards to the production runtime and
 * adds no behaviour of its own yet.
 */

/**
 * Creates a JSX node in development.
 *
 * @param type Tag name, component or fragment.
 * @param props Prop bag, including `children`.
 * @param key Optional key.
 */
export function jsxDEV(
    type: unknown,
    props: Props | null,
    key?: string | number,
    isStaticChildren?: boolean,
    source?: unknown,
    self?: unknown,
): Child {
    void isStaticChildren;
    void source;
    void self;
    return jsx(type, props, key);
}

export { Fragment, jsx, jsxs } from "./jsx-runtime.js";
