/**
 * `@kyneticweb/dom`
 *
 * Fine-grained DOM renderer with typed TSX, components and context.
 */

export { Fragment, isServerMode, jsx, render, setServerMode } from "./dom.js";
export { isVNode } from "./vnode.js";
export type {
    BoundaryVNode,
    ComponentVNode,
    EachVNode,
    ElementVNode,
    FragmentVNode,
    PortalVNode,
    ProviderVNode,
    VNode,
    WhenVNode,
} from "./vnode.js";
export { ErrorBoundary, For, Portal, Show } from "./components.js";
export type { ErrorBoundaryProps, ForKey, ForProps, PortalProps, ShowProps } from "./components.js";
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
    setErrorHandler,
    untrack,
} from "@kyneticweb/reactive";
export type { Accessor, Computed, Dispose, ErrorHandler, Setter, Signal, SignalOptions } from "@kyneticweb/reactive";
