import {
    createEffect,
    createOwner,
    createSignal,
    disposeOwner,
    onCleanup,
    runWithOwner,
    type Owner,
} from "@kyneticweb/reactive";
import { resolveChild } from "./child.js";
import { isServerMode, toNodes } from "./dom.js";
import type { Child } from "./types.js";

/** Key used to reconcile list items. */
export type ForKey = string | number | object;

/** Props accepted by {@link For}. */
export interface ForProps<T> {
    /** Items to render: an array or an accessor returning one. */
    readonly each: readonly T[] | (() => readonly T[]);
    /** Renders one item. Runs once per item, not on every update. */
    readonly children: (item: T, index: number) => Child;
    /** Stable identity for reordering. Defaults to the item for objects, the index for primitives. */
    readonly keyBy?: (item: T, index: number) => ForKey;
    /** Rendered when the list is empty. */
    readonly fallback?: Child;
}

/** Internal bookkeeping for one rendered item. */
interface ForItem<T> {
    /** Value passed to the render function (a proxy for objects). */
    readonly item: T;
    /** Latest raw item. */
    current: T;
    /** Updates the proxy target in place, when the item is an object. */
    readonly update?: (next: T) => void;
    readonly nodes: Node[];
    readonly owner: Owner;
}

/**
 * Keyed list with per-item ownership.
 *
 * Items keep their DOM nodes, effects and focus while they remain in the
 * collection. Items are re-created when their object identity changes, so a
 * new object (common with immutable updates) gets fresh content.
 *
 * @example
 * ```tsx
 * <For each={todos} keyBy={(todo) => todo.id}>
 *     {(todo) => <li>{todo.text}</li>}
 * </For>
 * ```
 */
export function For<T>(props: ForProps<T>): Node {
    if (isServerMode()) {
        return {
            kind: "each",
            each: props.each,
            render: props.children,
            fallback: props.fallback,
        } as unknown as Node;
    }

    const fragment = document.createDocumentFragment();
    const anchor = document.createComment("for");
    fragment.appendChild(anchor);

    const items = new Map<ForKey, ForItem<T>>();
    let fallbackNodes: Node[] = [];
    let fallbackOwner: Owner | null = null;

    // Owned by the component that contains <For>, not by the list effect.
    onCleanup(() => {
        if (fallbackOwner !== null) {
            disposeOwner(fallbackOwner);
            fallbackOwner = null;
        }
        for (const record of items.values()) {
            disposeOwner(record.owner);
        }
        items.clear();
    });

    createEffect(() => {
        const initial = items.size === 0;
        const source = typeof props.each === "function" ? props.each() : props.each;
        const next = new Map<ForKey, ForItem<T>>();
        const order: ForKey[] = [];

        for (let index = 0; index < source.length; index += 1) {
            const item = source[index] as T;
            const key = props.keyBy ? props.keyBy(item, index) : defaultKey(item, index);

            if (next.has(key)) {
                console.warn(`<For> received a duplicate key: ${String(key)}. The first item wins.`);
                continue;
            }
            order.push(key);

            const previous = items.get(key);
            if (previous !== undefined) {
                if (Object.is(previous.current, item)) {
                    next.set(key, previous);
                    continue;
                }
                if (isObject(item) && previous.update !== undefined) {
                    previous.current = item;
                    previous.update(item);
                    next.set(key, previous);
                    continue;
                }
                disposeOwner(previous.owner);
                removeNodes(previous.nodes);
            }

            let rendered: T = item;
            let update: ((next: T) => void) | undefined;
            if (isObject(item)) {
                const reactive = reactiveItem(item);
                rendered = reactive.value as T;
                update = reactive.update as (next: T) => void;
            }

            const owner = createOwner();
            const nodes = runWithOwner(owner, () => toNodes(props.children(rendered, index)));
            next.set(key, { item: rendered, current: item, update, nodes, owner });
        }

        // Dispose items that disappeared.
        for (const [key, record] of items) {
            if (!next.has(key)) {
                disposeOwner(record.owner);
                removeNodes(record.nodes);
            }
        }

        // Remove the fallback first so the anchor is the only reference node.
        if (fallbackOwner !== null) {
            disposeOwner(fallbackOwner);
            fallbackOwner = null;
        }
        for (const node of fallbackNodes) {
            node.parentNode?.removeChild(node);
        }
        fallbackNodes = [];

        // Reorder by walking backwards: a node already immediately before the
        // cursor is in place and costs no DOM mutation.
        const parent = anchor.parentNode ?? fragment;
        if (initial && order.length > 0) {
            // First render: insert everything in one DOM operation.
            const batch = document.createDocumentFragment();
            for (const key of order) {
                const record = next.get(key) as ForItem<T>;
                for (const node of record.nodes) {
                    batch.appendChild(node);
                }
            }
            parent.insertBefore(batch, anchor);
        } else {
            let cursor: Node = anchor;
            for (let index = order.length - 1; index >= 0; index -= 1) {
                const record = next.get(order[index] as ForKey);
                if (record === undefined) {
                    continue;
                }
                for (let nodeIndex = record.nodes.length - 1; nodeIndex >= 0; nodeIndex -= 1) {
                    const node = record.nodes[nodeIndex] as Node;
                    if (node.nextSibling !== cursor) {
                        parent.insertBefore(node, cursor);
                    }
                    cursor = node;
                }
            }
        }

        // Fallback when the collection is empty.
        if (source.length === 0 && props.fallback !== undefined) {
            fallbackOwner = createOwner();
            fallbackNodes = runWithOwner(fallbackOwner, () => toNodes(props.fallback));
            for (const node of fallbackNodes) {
                parent.insertBefore(node, anchor);
            }
        }

        items.clear();
        for (const [key, record] of next) {
            items.set(key, record);
        }
    });

    return fragment;
}

/** Props accepted by {@link Show}. */
export interface ShowProps {
    /** Condition: a boolean or an accessor returning one. */
    readonly when: boolean | (() => boolean);
    /** Rendered while the condition is true. */
    readonly children: Child;
    /** Rendered while the condition is false. */
    readonly fallback?: Child;
}

/**
 * Conditional branch that mounts only the active subtree.
 *
 * @example
 * ```tsx
 * <Show when={loading} fallback={<Content />}>
 *     <Spinner />
 * </Show>
 * ```
 */
export function Show(props: ShowProps): Node {
    if (isServerMode()) {
        return {
            kind: "when",
            when: props.when,
            children: props.children,
            fallback: props.fallback,
        } as unknown as Node;
    }

    const fragment = document.createDocumentFragment();
    const anchor = document.createComment("show");
    fragment.appendChild(anchor);

    let owner: Owner | null = null;
    let current: Node[] = [];

    const clear = (): void => {
        if (owner !== null) {
            disposeOwner(owner);
            owner = null;
        }
        for (const node of current) {
            node.parentNode?.removeChild(node);
        }
        current = [];
    };

    onCleanup(clear);

    createEffect(() => {
        const visible = typeof props.when === "function" ? props.when() : props.when;
        clear();

        owner = createOwner();
        const next = runWithOwner(owner, () => toNodes(visible ? props.children : props.fallback));
        const parent = anchor.parentNode ?? fragment;
        for (const node of next) {
            parent.insertBefore(node, anchor);
        }
        current = next;
    });

    return fragment;
}

/** Props accepted by {@link Portal}. */
export interface PortalProps {
    /** Element that receives the content. */
    readonly mount: Element;
    /** Content to move into `mount`. */
    readonly children: Child;
}

/**
 * Renders children into another element while keeping a placeholder in the
 * original position. Useful for modals, tooltips and overlays.
 *
 * @example
 * ```tsx
 * <Portal mount={document.body}>
 *     <div class="modal">...</div>
 * </Portal>
 * ```
 */
export function Portal(props: PortalProps): Node {
    if (isServerMode()) {
        return { kind: "portal", children: resolveChild(props.children) } as unknown as Node;
    }

    const placeholder = document.createComment("portal");
    const nodes = toNodes(props.children);

    for (const node of nodes) {
        props.mount.appendChild(node);
    }

    onCleanup(() => {
        for (const node of nodes) {
            node.parentNode?.removeChild(node);
        }
        placeholder.parentNode?.removeChild(placeholder);
    });

    return placeholder;
}

/** Props accepted by {@link ErrorBoundary}. */
export interface ErrorBoundaryProps {
    /** Renders the error; `reset` retries the children. */
    readonly fallback: (error: Error, reset: () => void) => Child;
    /** Protected subtree. */
    readonly children: Child;
}

/**
 * Catches errors thrown while mounting or re-rendering children.
 *
 * Errors raised later inside event handlers are not caught; handle those where
 * they happen. `reset` re-mounts the protected subtree.
 *
 * @example
 * ```tsx
 * <ErrorBoundary fallback={(error) => <p>{error.message}</p>}>
 *     <RiskyWidget />
 * </ErrorBoundary>
 * ```
 */
export function ErrorBoundary(props: ErrorBoundaryProps): Node {
    if (isServerMode()) {
        return {
            kind: "boundary",
            fallback: props.fallback,
            children: props.children,
        } as unknown as Node;
    }

    const fragment = document.createDocumentFragment();
    const anchor = document.createComment("boundary");
    fragment.appendChild(anchor);

    let owner: Owner | null = null;
    let current: Node[] = [];

    const clear = (): void => {
        if (owner !== null) {
            disposeOwner(owner);
            owner = null;
        }
        for (const node of current) {
            node.parentNode?.removeChild(node);
        }
        current = [];
    };

    const mount = (child: Child): void => {
        owner = createOwner();
        const nodes = runWithOwner(owner, () => toNodes(resolveChild(child)));
        const parent = anchor.parentNode ?? fragment;
        for (const node of nodes) {
            parent.insertBefore(node, anchor);
        }
        current = nodes;
    };

    const render = (): void => {
        clear();
        try {
            mount(props.children);
        } catch (error) {
            clear();
            const failure = error instanceof Error ? error : new Error(String(error));
            mount(props.fallback(failure, reset));
        }
    };

    const reset = (): void => {
        render();
    };

    render();
    onCleanup(clear);

    return fragment;
}

/** Removes a list of nodes from the document. */
function removeNodes(nodes: readonly Node[]): void {
    for (const node of nodes) {
        node.parentNode?.removeChild(node);
    }
}

/** Default identity: objects by reference, primitives by position. */
function defaultKey<T>(item: T, index: number): ForKey {
    return typeof item === "object" && item !== null ? (item as object) : index;
}

/** Reports whether a value can be proxied. */
function isObject(value: unknown): value is object {
    return typeof value === "object" && value !== null;
}

/**
 * Wraps an item in a shallow reactive proxy.
 *
 * Reading any property subscribes the running effect. Updating the proxy
 * swaps the target and notifies, so rows keep their DOM and focus while their
 * content changes.
 *
 * Only top-level properties are reactive: nested objects and destructured
 * values captured in the component body are not.
 */
function reactiveItem<T extends object>(initial: T): { value: T; update(next: T): void } {
    let current = initial;
    const version = createSignal(0);

    const proxy = new Proxy({} as T, {
        get(_target, property) {
            version();
            const value = Reflect.get(current, property);
            return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(current) : value;
        },
        has(_target, property) {
            version();
            return Reflect.has(current, property);
        },
        ownKeys() {
            version();
            return Reflect.ownKeys(current);
        },
        getOwnPropertyDescriptor(_target, property) {
            version();
            const descriptor = Reflect.getOwnPropertyDescriptor(current, property);
            return descriptor === undefined ? undefined : { ...descriptor, configurable: true };
        },
        set() {
            return false;
        },
        deleteProperty() {
            return false;
        },
    });

    return {
        value: proxy,
        update(next) {
            if (Object.is(next, current)) {
                return;
            }
            current = next;
            version.update((value) => value + 1);
        },
    };
}
