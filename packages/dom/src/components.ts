import {
    createEffect,
    createOwner,
    createSignal,
    disposeOwner,
    onCleanup,
    runWithOwner,
    type Owner,
    type Signal,
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

    const each = props.each;
    const keyBy = props.keyBy;
    const renderItem = props.children;
    const fallback = props.fallback;

    let items = new Map<ForKey, ForItem<T>>();
    let order: ForKey[] = [];
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
        const source = typeof each === "function" ? (each as () => readonly T[])() : each;

        // Fast path: the keys did not move, so only item content can change.
        // This is the common case for immutable updates; it skips the map
        // rebuild, the reorder walk and every DOM write.
        if (order.length === source.length && order.length > 0) {
            let unchanged = true;
            for (let index = 0; index < source.length; index += 1) {
                const item = source[index] as T;
                const key = keyBy ? keyBy(item, index) : defaultKey(item, index);
                const record = items.get(key);
                if (key !== order[index] || record === undefined || !reuseItem(record, item)) {
                    unchanged = false;
                    break;
                }
            }
            if (unchanged) {
                return;
            }
        }

        const next = new Map<ForKey, ForItem<T>>();
        const keys: ForKey[] = [];
        const removed: Node[] = [];

        for (let index = 0; index < source.length; index += 1) {
            const item = source[index] as T;
            const key = keyBy ? keyBy(item, index) : defaultKey(item, index);

            if (next.has(key)) {
                console.warn(`<For> received a duplicate key: ${String(key)}. The first item wins.`);
                continue;
            }
            keys.push(key);

            const previous = items.get(key);
            if (previous !== undefined && reuseItem(previous, item)) {
                next.set(key, previous);
                continue;
            }
            if (previous !== undefined) {
                disposeOwner(previous.owner);
                collectNodes(previous.nodes, removed);
            }

            let rendered: T = item;
            let update: ((next: T) => void) | undefined;
            if (isObject(item)) {
                const reactive = reactiveItem(item);
                rendered = reactive.value as T;
                update = reactive.update as (next: T) => void;
            }

            const owner = createOwner();
            const nodes = runWithOwner(owner, () => toNodes(renderItem(rendered, index)));
            next.set(key, { item: rendered, current: item, update, nodes, owner });
        }

        // Dispose items that disappeared and collect their nodes for a single
        // bulk removal when they are contiguous.
        for (const [key, record] of items) {
            if (!next.has(key)) {
                disposeOwner(record.owner);
                collectNodes(record.nodes, removed);
            }
        }
        removeNodesBulk(removed);

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
        if (items.size === 0 && keys.length > 0) {
            // First render (or refill after a clear): one DOM operation.
            const batch = document.createDocumentFragment();
            for (const key of keys) {
                const record = next.get(key) as ForItem<T>;
                for (const node of record.nodes) {
                    batch.appendChild(node);
                }
            }
            parent.insertBefore(batch, anchor);
        } else {
            let cursor: Node = anchor;
            for (let index = keys.length - 1; index >= 0; index -= 1) {
                const record = next.get(keys[index] as ForKey);
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
        if (source.length === 0 && fallback !== undefined) {
            fallbackOwner = createOwner();
            fallbackNodes = runWithOwner(fallbackOwner, () => toNodes(fallback));
            for (const node of fallbackNodes) {
                parent.insertBefore(node, anchor);
            }
        }

        items = next;
        order = keys;
    });

    return fragment;
}

/** Reuses an existing row, updating its proxy in place when possible. */
function reuseItem<T>(record: ForItem<T>, item: T): boolean {
    if (Object.is(record.current, item)) {
        return true;
    }
    if (!isObject(item) || record.update === undefined) {
        return false;
    }
    record.current = item;
    record.update(item);
    return true;
}

/** Appends a row's nodes to the pending removal list. */
function collectNodes(nodes: readonly Node[], target: Node[]): void {
    for (const node of nodes) {
        target.push(node);
    }
}

/**
 * Removes nodes efficiently.
 *
 * Small or scattered batches are removed one by one. Large contiguous batches
 * (clearing the list, removing a block) use a single range deletion, which
 * keeps the work inside the DOM implementation.
 */
function removeNodesBulk(nodes: readonly Node[]): void {
    const count = nodes.length;
    if (count === 0) {
        return;
    }

    if (count >= 16) {
        const first = nodes[0];
        const last = nodes[count - 1];
        const parent = first?.parentNode ?? null;
        if (first !== undefined && last !== undefined && parent !== null && last.parentNode === parent) {
            let between = 0;
            let node = first.nextSibling;
            while (node !== null && node !== last) {
                between += 1;
                node = node.nextSibling;
            }
            if (node === last && between + 2 === count) {
                const range = document.createRange();
                range.setStartBefore(first);
                range.setEndAfter(last);
                range.deleteContents();
                return;
            }
        }
    }

    removeNodes(nodes);
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
    const state: ItemState = { current: initial, version: createSignal(0), revision: 0 };
    // The wrapper carries the state; the handler is shared by every row, so
    // creating a list does not allocate six closures per item.
    const target: ItemStateHolder = { [ITEM_STATE]: state };
    const proxy = new Proxy(target, ITEM_HANDLER) as unknown as T;

    return {
        value: proxy,
        update(next) {
            if (Object.is(next, state.current)) {
                return;
            }
            state.current = next;
            state.revision += 1;
            state.version.set(state.revision);
        },
    };
}

/** Reactive state behind one list item. */
interface ItemState {
    current: object;
    readonly version: Signal<number>;
    revision: number;
}

/** Proxy target that stores the item state under a private symbol. */
interface ItemStateHolder {
    readonly [ITEM_STATE]: ItemState;
}

/** Symbol used to reach the state from the shared proxy handler. */
const ITEM_STATE = Symbol("kynetic.item");

/**
 * Proxy handler shared by every list item.
 *
 * It forwards reads to the current object and subscribes the running effect to
 * a per-item version signal, which is what keeps rows alive across updates.
 */
const ITEM_HANDLER: ProxyHandler<ItemStateHolder> = {
    get(target, property) {
        const state = target[ITEM_STATE];
        state.version();
        const value = Reflect.get(state.current, property);
        return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(state.current) : value;
    },
    has(target, property) {
        const state = target[ITEM_STATE];
        state.version();
        return Reflect.has(state.current, property);
    },
    ownKeys(target) {
        const state = target[ITEM_STATE];
        state.version();
        return Reflect.ownKeys(state.current);
    },
    getOwnPropertyDescriptor(target, property) {
        const state = target[ITEM_STATE];
        state.version();
        const descriptor = Reflect.getOwnPropertyDescriptor(state.current, property);
        return descriptor === undefined ? undefined : { ...descriptor, configurable: true };
    },
    set() {
        return false;
    },
    deleteProperty() {
        return false;
    },
};
