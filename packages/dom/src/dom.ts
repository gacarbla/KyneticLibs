import {
    createEffect,
    createOwner,
    createRoot,
    disposeOwner,
    getOwner,
    onCleanup,
    runWithOwnerTracked,
    type Dispose,
    type Owner,
} from "@kyneticweb/reactive";
import { resolveChild } from "./child.js";
import { isVNode, type VNode } from "./vnode.js";
import type { Child, Component, Props } from "./types.js";

/**
 * DOM runtime.
 *
 * JSX is compiled to `jsx(type, props, ...children)` by the Kynetic compiler.
 * Dynamic expressions arrive as thunks; each thunk gets its own effect, so a
 * signal only updates the attribute or text node that read it.
 */

/** CSS properties that accept unitless numbers. */
const UNITLESS = new Set([
    "animationIterationCount",
    "borderImageOutset",
    "borderImageSlice",
    "borderImageWidth",
    "columnCount",
    "flex",
    "flexGrow",
    "flexShrink",
    "fontWeight",
    "gridArea",
    "gridColumn",
    "gridColumnEnd",
    "gridColumnStart",
    "gridRow",
    "gridRowEnd",
    "gridRowStart",
    "lineHeight",
    "opacity",
    "order",
    "orphans",
    "scale",
    "tabSize",
    "widows",
    "zIndex",
    "zoom",
]);

/** DOM event names that do not match the lowercased prop suffix. */
const EVENT_ALIASES: Readonly<Record<string, string>> = {
    doubleclick: "dblclick",
    mouseenter: "mouseenter",
    mouseleave: "mouseleave",
};

/** Attribute names whose DOM spelling differs from the prop. */
const ATTRIBUTE_ALIASES: Readonly<Record<string, string>> = {
    className: "class",
    htmlFor: "for",
    tabIndex: "tabindex",
    readOnly: "readonly",
    maxLength: "maxlength",
    colSpan: "colspan",
    rowSpan: "rowspan",
    autoComplete: "autocomplete",
    autoFocus: "autofocus",
    encType: "enctype",
    formAction: "formaction",
    noValidate: "novalidate",
    srcSet: "srcset",
};

/** Namespace for SVG elements. */
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/** Tags created in the SVG namespace. */
const SVG_TAGS = new Set([
    "svg",
    "path",
    "circle",
    "ellipse",
    "line",
    "polygon",
    "polyline",
    "rect",
    "g",
    "text",
    "defs",
    "use",
    "symbol",
    "clipPath",
    "mask",
    "linearGradient",
    "radialGradient",
    "stop",
]);

/** Style properties applied per element, so updates can remove stale ones. */
const APPLIED_STYLES = new WeakMap<Element, Set<string>>();

/**
 * Rendering target.
 *
 * - `client` creates real DOM nodes.
 * - `server` produces the universal node tree for HTML serialization.
 * - `hydrate` also produces the universal node tree, but effects run so they can
 *   attach to the adopted DOM.
 */
export type RenderMode = "client" | "server" | "hydrate";

let mode: RenderMode = "client";

/** Enables or disables server mode and returns the previous value. */
export function setServerMode(enabled: boolean): boolean {
    const previous = mode === "server";
    mode = enabled ? "server" : "client";
    return previous;
}

/** Reports whether the runtime produces server nodes (server or hydration). */
export function isServerMode(): boolean {
    return mode !== "client";
}

/** Reports whether a real server response is being rendered (not hydration). */
export function isServerRendering(): boolean {
    return mode === "server";
}

/**
 * Switches the render mode and returns the previous one.
 *
 * @internal Used by `hydrate` to keep effects alive while adopting markup.
 */
export function setRenderMode(next: RenderMode): RenderMode {
    const previous = mode;
    mode = next;
    return previous;
}

/** Props that must be written as DOM properties, not attributes. */
const PROPERTIES = new Set(["value", "checked", "selected", "disabled", "multiple", "readOnly", "indeterminate"]);

/**
 * Creates a virtual node.
 *
 * This is the classic JSX factory (`esbuild.jsxFactory`). Prefer writing TSX:
 * the compiler generates these calls for you.
 *
 * @param type Tag name, component or {@link Fragment}.
 * @param props Attribute and prop bag.
 * @param children Child list.
 */
export function jsx(type: string, props?: Props | null, ...children: Child[]): Node;
export function jsx<P extends object>(type: Component<P>, props?: P | null, ...children: Child[]): Child;
export function jsx(type: unknown, props?: unknown, ...children: Child[]): Child;
export function jsx(type: unknown, props?: unknown, ...children: Child[]): Child {
    if (mode !== "client") {
        const attrs = { ...((props as Props | null | undefined) ?? {}) };
        const kids = Object.hasOwn(attrs, "children") ? [...children, attrs["children"] as Child] : children;
        return createServerNode(type, attrs, kids);
    }
    return createNode(type, props, children);
}

/**
 * Builds a node for the universal tree.
 *
 * @internal Shared by the classic factory and the automatic JSX runtime.
 * @param type Tag, component or {@link Fragment}.
 * @param props Prop bag; `children` is ignored because it arrives positionally.
 * @param children Child list.
 */
export function createServerNode(type: unknown, props: Props, children: Child[]): Child {
    const attrs = { ...props };
    delete attrs["children"];
    if (type === Fragment) {
        return { kind: "fragment", children } as unknown as Child;
    }
    if (typeof type === "function") {
        return {
            kind: "component",
            component: type as (props: never) => unknown,
            props: attrs,
            children,
            owner: getOwner(),
        } as unknown as Child;
    }
    return { kind: "element", tag: String(type), props: attrs, children } as unknown as Child;
}

/**
 * Runtime entry used by the automatic JSX transform and by the classic
 * factory alike.
 *
 * @internal
 * @param type Tag, component or fragment.
 * @param props Prop bag.
 * @param children Positional children.
 */
export function createNode(type: unknown, props: unknown, children: Child[]): Child {
    if (type === Fragment) {
        return children;
    }
    if (typeof type === "function") {
        return createComponent(type as Component, (props as Props | null | undefined) ?? null, children);
    }
    return createElement(type as string, (props as Props | null | undefined) ?? null, children);
}

/**
 * Declares async work for the current server render.
 *
 * Synchronous rendering emits `fallback`; `renderToStringAsync` awaits the
 * promise and renders the tree again. The component that produced the promise
 * must cache its result, so the second pass can render synchronously.
 *
 * @param promise Work that must settle before the final pass.
 * @param fallback Markup shown by `renderToString` and while loading.
 * @param retry Re-renders the subtree once the promise settles. Required by
 * `renderToStream`; `renderToStringAsync` works without it.
 * @returns A pending server node.
 *
 * @example
 * ```tsx
 * function Profile(props: { id: string }) {
 *     const user = cache.get(props.id);
 *     if (user !== undefined) return <ProfileCard user={user} />;
 *     return createPending(
 *         fetchUser(props.id).then((value) => cache.set(props.id, value)),
 *         <Spinner />,
 *         () => <ProfileCard user={cache.get(props.id)!} />,
 *     );
 * }
 * ```
 */
export function createPending(promise: Promise<unknown>, fallback: Child = null, retry?: () => unknown): Child {
    if (mode === "client") {
        throw new Error("createPending() is only available while rendering on the server.");
    }
    return { kind: "pending", promise, children: fallback, retry } as unknown as Child;
}

/**
 * JSX fragment factory (`esbuild.jsxFragment`).
 *
 * @param props Optional props bag containing `children`.
 * @param children Positional children.
 */
export function Fragment(props: Props | null, ...children: Child[]): Child {
    if (mode !== "client") {
        return {
            kind: "fragment",
            children: children.length > 0 ? children : [props?.["children"]],
        } as unknown as Child;
    }
    if (children.length > 0) {
        return children;
    }
    return (props?.["children"] as Child) ?? null;
}

/** Builds a real element, applying props and appending children. */
function createElement(tag: string, props: Props | null, children: Child[]): Element {
    const element = SVG_TAGS.has(tag) ? document.createElementNS(SVG_NAMESPACE, tag) : document.createElement(tag);
    const attrs = props ?? {};
    const dynamic: Array<() => void> = [];

    for (const [key, value] of Object.entries(attrs)) {
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
        if (typeof value === "function") {
            const read = value as () => unknown;
            let previous: unknown = UNSET;
            dynamic.push(() => {
                const next = read();
                if (Object.is(previous, next)) {
                    return;
                }
                previous = next;
                setStaticProp(element, key, next);
            });
            continue;
        }
        setStaticProp(element, key, value);
    }

    if (Object.hasOwn(attrs, "children") && children.length === 0) {
        appendChild(element, attrs["children"] as Child);
    }
    for (const child of children) {
        if (typeof child === "function") {
            dynamic.push(createDynamicChild(element, child));
        } else {
            appendChild(element, child);
        }
    }

    // One effect per element keeps the number of computations proportional to
    // the DOM, not to the number of dynamic expressions.
    if (dynamic.length > 0) {
        createEffect(() => {
            for (let index = 0; index < dynamic.length; index += 1) {
                (dynamic[index] as () => void)();
            }
        });
    }

    return element;
}

/** Registers a DOM listener and removes it with the owner. */
export function addEvent(element: Element, prop: string, handler: EventListener): void {
    const capture = prop.endsWith("Capture");
    const type = eventName(prop, capture);
    element.addEventListener(type, handler, capture);
    onCleanup(() => element.removeEventListener(type, handler, capture));
}

/** Converts `onKeyDown` into `keydown`, honouring the `Capture` suffix. */
function eventName(prop: string, capture: boolean): string {
    const base = capture ? prop.slice(0, -"Capture".length) : prop;
    const suffix = base.slice(2).toLowerCase();
    return EVENT_ALIASES[suffix] ?? suffix;
}

/** Writes a static attribute or property. */
export function setStaticProp(element: Element, key: string, value: unknown): void {
    if (key === "class" || key === "className") {
        element.setAttribute("class", classValue(value));
        return;
    }
    if (key === "style") {
        setStyle(element as HTMLElement, value);
        return;
    }
    if (key === "innerHTML" || key === "html") {
        element.innerHTML = value === null || value === undefined ? "" : String(value);
        return;
    }
    if (key === "textContent") {
        element.textContent = value === null || value === undefined ? "" : String(value);
        return;
    }
    if (PROPERTIES.has(key)) {
        (element as unknown as Record<string, unknown>)[key] = value;
        return;
    }

    const attribute = ATTRIBUTE_ALIASES[key] ?? key;
    if (value === null || value === undefined || value === false) {
        element.removeAttribute(attribute);
        return;
    }
    if (value === true) {
        element.setAttribute(attribute, "");
        return;
    }
    element.setAttribute(attribute, String(value));
}

/** Normalizes a class value into a string. */
function classValue(value: unknown): string {
    if (typeof value === "string") {
        return value;
    }
    if (Array.isArray(value)) {
        return value.filter((item) => typeof item === "string" && item.length > 0).join(" ");
    }
    if (typeof value === "object" && value !== null) {
        return Object.entries(value as Record<string, unknown>)
            .filter(([, enabled]) => Boolean(enabled))
            .map(([name]) => name)
            .join(" ");
    }
    return "";
}

/** Applies CSS text or a property map, removing properties that disappeared. */
function setStyle(element: HTMLElement, value: unknown): void {
    if (typeof value === "string") {
        element.style.cssText = value;
        APPLIED_STYLES.delete(element);
        return;
    }

    const previous = APPLIED_STYLES.get(element) ?? new Set<string>();
    const next = new Set<string>();

    if (typeof value === "object" && value !== null) {
        for (const [property, raw] of Object.entries(value as Record<string, unknown>)) {
            if (raw === null || raw === undefined) {
                continue;
            }
            const propertyName = toKebabCase(property);
            next.add(propertyName);
            const text = typeof raw === "number" && !UNITLESS.has(property) ? `${raw}px` : String(raw);
            element.style.setProperty(propertyName, text);
        }
    }

    for (const property of previous) {
        if (!next.has(property)) {
            element.style.removeProperty(property);
        }
    }
    APPLIED_STYLES.set(element, next);
}

/** Converts `backgroundColor` into `background-color`. */
function toKebabCase(property: string): string {
    if (property.startsWith("--")) {
        return property;
    }
    return property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/** Appends a child to a real node. */
function appendChild(parent: Node, child: Child): void {
    if (child === null || child === undefined || child === false || child === true) {
        return;
    }
    if (typeof child === "function") {
        createDynamicChild(parent, child)();
        return;
    }
    if (Array.isArray(child)) {
        for (const item of child) {
            appendChild(parent, item);
        }
        return;
    }
    if (child instanceof Node) {
        parent.appendChild(child);
        return;
    }
    parent.appendChild(document.createTextNode(String(child)));
}

/** Sentinel used to force the first dynamic write. */
const UNSET = Symbol("kynetic.unset");

/**
 * Creates a slot for a dynamic child.
 *
 * Text updates reuse the existing text node; other values keep their position
 * through the previous sibling, so no comment anchor is needed while the slot
 * has content. A comment placeholder is only inserted when the slot becomes
 * empty, which preserves insertion order for later updates.
 *
 * @returns An updater that resolves the thunk and patches the slot.
 */
function createDynamicChild(parent: Node, read: () => Child): () => void {
    let current: Node[] = [];
    let placeholder: Node | null = null;
    let owner: Owner | null = null;

    onCleanup(() => {
        if (owner !== null) {
            disposeOwner(owner);
            owner = null;
        }
    });

    return () => {
        const reusingText = current.length === 1 && current[0]?.nodeType === Node.TEXT_NODE;

        // Reuse the slot owner for in-place text updates; start a fresh scope
        // only when the previous content could own effects.
        let contentOwner: Owner;
        if (reusingText && owner !== null) {
            contentOwner = owner;
        } else {
            if (owner !== null) {
                disposeOwner(owner);
            }
            contentOwner = createOwner();
            owner = contentOwner;
        }

        const value = runWithOwnerTracked(contentOwner, () => resolveChild(read()));
        const isText = typeof value === "string" || typeof value === "number";

        if (isText && reusingText) {
            const node = current[0] as Text;
            const text = String(value);
            if (node.data !== text) {
                node.data = text;
            }
            return;
        }

        const first = current[0] ?? placeholder;
        const target = first?.parentNode ?? parent;
        const last = current.length > 0 ? current[current.length - 1] : placeholder;
        const reference = last?.nextSibling ?? null;

        for (const node of current) {
            node.parentNode?.removeChild(node);
        }

        const next: Node[] = isText
            ? [document.createTextNode(String(value))]
            : runWithOwnerTracked(contentOwner, () => toNodes(value));

        if (next.length === 0) {
            if (placeholder === null) {
                placeholder = document.createComment("kynetic");
                target.insertBefore(placeholder, reference);
            }
            current = [];
            return;
        }

        for (const node of next) {
            target.insertBefore(node, reference);
        }
        current = next;
    };
}

/**
 * Creates a node that re-renders a thunk whenever its dependencies change.
 *
 * A comment acts as a stable anchor: new nodes are inserted before it and
 * removed before the next run, so the parent can change without breaking the
 * effect (fragment insertion moves the anchor with the content).
 */
function renderDynamic(read: () => Child): Node {
    const fragment = document.createDocumentFragment();
    const anchor = document.createComment("kynetic");
    fragment.appendChild(anchor);
    let current: Node[] = [];
    let owner = createOwner();

    onCleanup(() => disposeOwner(owner));

    createEffect(() => {
        // Replace the previous content's owner before creating the new tree.
        disposeOwner(owner);
        owner = createOwner();
        // Tracked: the slot must stay subscribed to the expression that
        // produced this content, while the content belongs to its own owner.
        const next = runWithOwnerTracked(owner, () => toNodes(read()));
        for (const node of current) {
            node.parentNode?.removeChild(node);
        }
        const parent = anchor.parentNode ?? fragment;
        for (const node of next) {
            parent.insertBefore(node, anchor);
        }
        current = next;
    });

    return fragment;
}

/** Normalizes a child value into real DOM nodes. */
export function toNodes(value: Child): Node[] {
    const resolved = resolveChild(value);
    if (resolved === null || resolved === undefined || resolved === false || resolved === true) {
        return [];
    }
    if (isVNode(resolved)) {
        return materializeNode(resolved);
    }
    if (Array.isArray(resolved)) {
        return resolved.flatMap((item) => toNodes(item));
    }
    if (resolved instanceof Node) {
        return [resolved];
    }
    return [document.createTextNode(String(resolved))];
}

/**
 * Builds DOM nodes from a universal (server) node.
 *
 * A component may keep markup created during server rendering or hydration and
 * insert it later; without this conversion the node would be stringified.
 *
 * @param node Universal node.
 * @returns Real DOM nodes.
 */
export function materializeNode(node: VNode): Node[] {
    switch (node.kind) {
        case "element":
            return [createElement(node.tag, node.props as Props, node.children as Child[])];
        case "component": {
            const children = node.children as Child[];
            return toNodes(createComponent(node.component as Component, node.props as Props, children));
        }
        case "fragment":
            return toNodes(node.children as Child);
        case "each": {
            const items = typeof node.each === "function" ? node.each() : node.each;
            if (items.length === 0) {
                return toNodes((node.fallback as Child) ?? null);
            }
            const nodes: Node[] = [];
            for (let index = 0; index < items.length; index += 1) {
                const item = items[index];
                for (const child of toNodes(node.render(item, index) as Child)) {
                    nodes.push(child);
                }
            }
            return nodes;
        }
        case "when": {
            const visible = typeof node.when === "function" ? node.when() : node.when;
            return toNodes((visible ? node.children : node.fallback) as Child);
        }
        case "portal":
            return toNodes(node.children as Child);
        case "provider":
            return node.context.runWith(node.value, () => toNodes(node.children as Child));
        case "boundary": {
            try {
                return toNodes(node.children as Child);
            } catch (error) {
                return toNodes(
                    node.fallback(error instanceof Error ? error : new Error(String(error)), () => undefined) as Child,
                );
            }
        }
        case "pending":
            return toNodes(node.children as Child);
    }
}

/** Creates a component instance and materializes its output inside its root. */
function createComponent<P extends object>(component: Component<P>, props: Props | null, children: Child[]): Child {
    const merged = { ...(props ?? {}) } as Props & { children?: Child };
    if (children.length === 1) {
        merged.children = children[0];
    } else if (children.length > 1) {
        merged.children = children;
    }

    return createRoot(() => {
        const output = component(merged as P & { children?: Child });
        return materialize(output);
    });
}

/** Converts a component output into a single node. */
function materialize(output: Child): Node {
    if (typeof output === "function") {
        return renderDynamic(output);
    }
    const nodes = toNodes(output);
    if (nodes.length === 1) {
        return nodes[0] as Node;
    }
    const fragment = document.createDocumentFragment();
    for (const node of nodes) {
        fragment.appendChild(node);
    }
    return fragment;
}

/**
 * Mounts a component into a container.
 *
 * @param component Root component, usually `() => <App />`.
 * @param container Element that receives the tree.
 * @returns Disposer that unmounts the tree and runs every cleanup.
 *
 * @example
 * ```tsx
 * const dispose = render(() => <App />, document.getElementById("app")!);
 * ```
 */
export function render(component: () => Child, container: Element): Dispose {
    return createRoot((dispose) => {
        const node = materialize(component());
        container.replaceChildren(node);
        onCleanup(() => container.replaceChildren());
        return dispose;
    });
}
