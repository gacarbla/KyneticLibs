/**
 * `@kyneticweb/dom`
 *
 * Fine-grained DOM renderer with typed TSX, components and context.
 */

export { Fragment, jsx, render } from "./dom.js";
export { Context, createContext, useContext } from "./context.js";
export { onMount } from "./lifecycle.js";
export type { Child, ClassValue, Component, Primitive, Props, StyleValue } from "./types.js";
export type { ElementProps, EventProps, IntrinsicElementMap } from "./jsx-types.js";

export {
    batch,
    createComputed,
    createEffect,
    createRoot,
    createSignal,
    onCleanup,
    untrack,
} from "@kyneticweb/reactive";
export type { Accessor, Computed, Dispose, Setter, Signal, SignalOptions } from "@kyneticweb/reactive";
