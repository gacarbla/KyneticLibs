import {
    createEffect,
    createOwner,
    createRoot,
    disposeOwner,
    onCleanup,
    runWithOwner,
    type Dispose,
} from "@kyneticweb/reactive";
import { isVNode, type VNode } from "./vnode.js";
import { addEvent, render, setRenderMode, setStaticProp, toNodes } from "./dom.js";
import type { Child, Props } from "./types.js";

/** Thrown when the server markup cannot be adopted. */
class HydrationMismatch extends Error {}

/**
 * Hydrates server markup produced by `@kyneticweb/ssr`.
 *
 * Elements, components, fragments, dynamic text/attributes and context
 * providers are adopted in place, so the browser keeps the server DOM and only
 * attaches reactive bindings. Collections, conditionals, portals and error
 * boundaries fall back to a client render of the whole root, which is correct
 * but recreates those nodes.
 *
 * @param component Root component, the same one used on the server.
 * @param container Element that contains the server markup.
 * @returns Disposer that unmounts the tree.
 *
 * @example
 * ```ts
 * hydrate(() => <App />, document.getElementById("app")!);
 * ```
 */
export function hydrate(component: () => Child, container: Element): Dispose {
    const previousMode = setRenderMode("hydrate");
    try {
        const dispose = createRoot((release) => {
            try {
                const vnode = component();
                hydrateValue(vnode, container, container.firstChild);
                onCleanup(() => container.replaceChildren());
                return release;
            } catch (error) {
                release();
                throw error;
            }
        });
        return dispose;
    } catch {
        // Unsupported node or markup mismatch: render the tree on the client.
        setRenderMode("client");
        return render(component, container);
    } finally {
        setRenderMode(previousMode);
    }
}

/** Hydrates one child value and returns the next cursor. */
function hydrateValue(value: unknown, parent: Node, cursor: Node | null): Node | null {
    if (value === null || value === undefined || value === false || value === true) {
        return cursor;
    }
    if (Array.isArray(value)) {
        let next = cursor;
        for (const item of value) {
            next = hydrateValue(item, parent, next);
        }
        return next;
    }
    if (typeof value === "function") {
        return hydrateDynamic(value as () => unknown, parent, cursor);
    }
    if (isVNode(value)) {
        return hydrateNode(value, parent, cursor);
    }
    if (typeof value === "string" || typeof value === "number") {
        return hydrateText(String(value), cursor);
    }
    throw new HydrationMismatch(`Cannot hydrate a value of type "${typeof value}".`);
}

/** Adopts an existing text node. */
function hydrateText(expected: string, cursor: Node | null): Node | null {
    if (cursor === null || cursor.nodeType !== Node.TEXT_NODE) {
        throw new HydrationMismatch("Expected a text node.");
    }
    if (cursor.textContent !== expected) {
        cursor.textContent = expected;
    }
    return cursor.nextSibling;
}

/** Adopts a dynamic slot and updates it after the first client change. */
function hydrateDynamic(read: () => unknown, parent: Node, cursor: Node | null): Node | null {
    const first = cursor;
    let owner = createOwner();
    const after = runWithOwner(owner, () => hydrateValue(read(), parent, cursor));
    const anchor = document.createComment("kynetic-hydrated");
    parent.insertBefore(anchor, after);
    // An empty slot starts at the anchor (its range is empty); a non-empty one
    // starts at its first adopted node. The start must move after every update,
    // otherwise the next update would try to remove detached nodes.
    let start: Node | null = after === first ? anchor : first;
    let initial = true;

    createEffect(() => {
        read();
        if (initial) {
            initial = false;
            return;
        }

        disposeOwner(owner);
        removeBetween(parent, start, anchor);
        owner = createOwner();
        const nodes = runWithOwner(owner, () => toNodes(read() as Child));
        for (const node of nodes) {
            parent.insertBefore(node, anchor);
        }
        start = nodes[0] ?? anchor;
    });

    onCleanup(() => disposeOwner(owner));
    return anchor.nextSibling;
}

/** Hydrates one server node. */
function hydrateNode(node: VNode, parent: Node, cursor: Node | null): Node | null {
    switch (node.kind) {
        case "element":
            return hydrateElement(node, cursor);
        case "component": {
            const props = { ...node.props };
            if (node.children.length === 1) {
                props["children"] = node.children[0];
            } else if (node.children.length > 1) {
                props["children"] = node.children;
            }
            const run = (): Node | null => {
                const output = (node.component as (props: Props) => unknown)(props);
                return hydrateValue(output, parent, cursor);
            };
            // The owner captured when the node was created carries the
            // provider scopes, so context works for deferred components.
            return node.owner === undefined || node.owner === null ? run() : runWithOwner(node.owner, run);
        }
        case "fragment": {
            let next = cursor;
            for (const child of node.children) {
                next = hydrateValue(child, parent, next);
            }
            return next;
        }
        case "provider":
            return node.context.runWith(node.value, () => hydrateValue(node.children, parent, cursor));
        case "each":
        case "when":
        case "portal":
        case "boundary":
        case "pending":
            throw new HydrationMismatch(`Hydration for "${node.kind}" nodes is not supported yet.`);
    }
}

/** Adopts one element, its dynamic attributes and its children. */
function hydrateElement(node: Extract<VNode, { kind: "element" }>, cursor: Node | null): Node | null {
    const element = findElement(cursor, node.tag);
    if (element === null) {
        throw new HydrationMismatch(`Expected <${node.tag}>.`);
    }

    for (const [key, value] of Object.entries(node.props)) {
        if (key === "children" || key === "key") {
            continue;
        }
        if (key === "ref") {
            if (typeof value === "function") {
                const ref = value as (element: Element | null) => void;
                ref(element);
                onCleanup(() => ref(null));
            }
            continue;
        }
        if (key.startsWith("on") && typeof value === "function") {
            addEvent(element, key, value as EventListener);
            continue;
        }
        if (typeof value !== "function") {
            continue;
        }
        let first = true;
        createEffect(() => {
            const next = (value as () => unknown)();
            if (first) {
                first = false;
                return;
            }
            setStaticProp(element, key, next);
        });
    }

    let childCursor: Node | null = element.firstChild;
    for (const child of node.children) {
        childCursor = hydrateValue(child, element, childCursor);
    }

    return element.nextSibling;
}

/** Finds the next element with the expected tag, skipping comments and blank text. */
function findElement(cursor: Node | null, tag: string): Element | null {
    let node = cursor;
    while (node !== null) {
        if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            return element.tagName.toLowerCase() === tag.toLowerCase() ? element : null;
        }
        if (node.nodeType === Node.COMMENT_NODE) {
            node = node.nextSibling;
            continue;
        }
        if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim().length === 0) {
            node = node.nextSibling;
            continue;
        }
        return null;
    }
    return null;
}

/** Removes siblings from `start` (inclusive) up to `end` (exclusive). */
function removeBetween(parent: Node, start: Node | null, end: Node): void {
    let node = start;
    while (node !== null && node !== end) {
        const next = node.nextSibling;
        if (node.parentNode === parent) {
            parent.removeChild(node);
        }
        node = next;
    }
}
