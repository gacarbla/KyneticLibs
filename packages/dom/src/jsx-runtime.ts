import "./jsx-types.js";
import { createNode, createServerNode, Fragment as FragmentRuntime, isServerMode } from "./dom.js";
import type { Child, Props } from "./types.js";

/**
 * Automatic JSX runtime (`jsxImportSource: "@kyneticweb/dom"`).
 *
 * TypeScript and Vite call `jsx`/`jsxs` with a single props object that
 * contains `children`. The dynamic-expression compiler has already turned
 * reactive values into thunks, so this module only has to split `children`
 * and delegate to the shared node factory.
 */

/**
 * Creates a JSX node.
 *
 * @param type Tag name, component or fragment.
 * @param props Prop bag, including `children`.
 * @param _key Optional key (consumed by keyed collections).
 */
export function jsx(type: unknown, props: Props | null, key?: string | number): Child {
    // Keys are accepted for API compatibility; keyed collections consume them.
    void key;
    const { children, ...rest } = props ?? {};
    const kids = toChildren(children);
    // Server rendering and hydration build the universal tree; only live
    // client rendering touches the DOM.
    if (isServerMode()) {
        return createServerNode(type, rest, kids);
    }
    return createNode(type, rest, kids);
}

/** Same as {@link jsx}, used by the compiler for static child lists. */
export const jsxs = jsx;

/** Fragment component for `<>...</>`. */
export const Fragment = FragmentRuntime;

/** Normalizes the `children` prop into a positional list. */
function toChildren(children: unknown): Child[] {
    if (children === undefined || children === null) {
        return [];
    }
    return Array.isArray(children) ? (children as Child[]) : [children as Child];
}
