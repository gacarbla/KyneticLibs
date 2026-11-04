/**
 * Universal node tree used by the server renderer.
 *
 * The client runtime keeps creating real DOM nodes (fast, fine-grained). When
 * server mode is enabled, `jsx` returns these plain objects instead, so the
 * same components can be rendered to HTML without a DOM.
 */

import type { Owner } from "@kyneticweb/reactive";

/** Element node. */
export interface ElementVNode {
    readonly kind: "element";
    readonly tag: string;
    readonly props: Record<string, unknown>;
    readonly children: unknown[];
}

/** Component node. */
export interface ComponentVNode {
    readonly kind: "component";
    readonly component: (props: never) => unknown;
    readonly props: Record<string, unknown>;
    readonly children: unknown[];
    /** Owner active when the node was created, so hydration can restore context. */
    readonly owner?: Owner | null;
}

/** Fragment node. */
export interface FragmentVNode {
    readonly kind: "fragment";
    readonly children: unknown[];
}

/** Keyed collection node produced by `<For>`. */
export interface EachVNode {
    readonly kind: "each";
    readonly each: readonly unknown[] | (() => readonly unknown[]);
    readonly render: (item: unknown, index: number) => unknown;
    readonly keyBy?: (item: unknown, index: number) => string | number | object;
    readonly fallback?: unknown;
}

/** Conditional node produced by `<Show>`. */
export interface WhenVNode {
    readonly kind: "when";
    readonly when: boolean | (() => boolean);
    readonly children: unknown;
    readonly fallback?: unknown;
}

/** Portal node; renders its children inline on the server. */
export interface PortalVNode {
    readonly kind: "portal";
    readonly children: unknown;
}

/** Error boundary node. */
export interface BoundaryVNode {
    readonly kind: "boundary";
    readonly fallback: (error: Error, reset: () => void) => unknown;
    readonly children: unknown;
}

/** Provider node; the renderer pushes the value while rendering children. */
export interface ProviderVNode {
    readonly kind: "provider";
    readonly context: { runWith<T>(value: unknown, render: () => T): T };
    readonly value: unknown;
    readonly children: unknown;
}

/**
 * Async boundary node produced by {@link createPending}.
 *
 * Synchronous rendering emits `children` (usually a loading placeholder).
 * `renderToStringAsync` awaits `promise` and renders again, so the component
 * behind the boundary must cache its result once the promise settles.
 */
export interface PendingVNode {
    readonly kind: "pending";
    readonly promise: Promise<unknown>;
    readonly children: unknown;
}

/** Any server node. */
export type VNode =
    | ElementVNode
    | ComponentVNode
    | FragmentVNode
    | EachVNode
    | WhenVNode
    | PortalVNode
    | BoundaryVNode
    | ProviderVNode
    | PendingVNode;

/** Reports whether a value is a server node. */
export function isVNode(value: unknown): value is VNode {
    return typeof value === "object" && value !== null && "kind" in value;
}
