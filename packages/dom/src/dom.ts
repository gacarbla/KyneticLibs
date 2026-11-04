import { createEffect, createRoot, onCleanup, type Dispose } from "@kyneticweb/reactive";
import { resolveChild } from "./child.js";
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
    return createNode(type, props, children);
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
 * JSX fragment factory (`esbuild.jsxFragment`).
 *
 * @param props Optional props bag containing `children`.
 * @param children Positional children.
 */
export function Fragment(props: Props | null, ...children: Child[]): Child {
    if (children.length > 0) {
        return children;
    }
    return (props?.["children"] as Child) ?? null;
}

/** Builds a real element, applying props and appending children. */
function createElement(tag: string, props: Props | null, children: Child[]): Element {
    const element = document.createElement(tag);
    const attrs = props ?? {};

    for (const [key, value] of Object.entries(attrs)) {
        if (key === "children") {
            continue;
        }
        applyProp(element, key, value);
    }

    if (Object.hasOwn(attrs, "children") && children.length === 0) {
        appendChild(element, attrs["children"] as Child);
    }
    for (const child of children) {
        appendChild(element, child);
    }

    return element;
}

/** Applies one prop: refs, events, dynamic thunks or static values. */
function applyProp(element: Element, key: string, value: unknown): void {
    if (key === "key") {
        return;
    }
    if (key === "ref") {
        if (typeof value === "function") {
            const ref = value as (element: Element | null) => void;
            ref(element);
            onCleanup(() => ref(null));
        }
        return;
    }
    if (key.startsWith("on") && typeof value === "function") {
        addEvent(element, key, value as EventListener);
        return;
    }
    if (typeof value === "function") {
        createEffect(() => setStaticProp(element, key, (value as () => unknown)()));
        return;
    }
    setStaticProp(element, key, value);
}

/** Registers a DOM listener and removes it with the owner. */
function addEvent(element: Element, prop: string, handler: EventListener): void {
    const type = eventName(prop);
    element.addEventListener(type, handler);
    onCleanup(() => element.removeEventListener(type, handler));
}

/** Converts `onKeyDown` into `keydown`. */
function eventName(prop: string): string {
    const suffix = prop.slice(2).toLowerCase();
    return EVENT_ALIASES[suffix] ?? suffix;
}

/** Writes a static attribute or property. */
function setStaticProp(element: Element, key: string, value: unknown): void {
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

/** Applies CSS text or a property map. */
function setStyle(element: HTMLElement, value: unknown): void {
    if (typeof value === "string") {
        element.style.cssText = value;
        return;
    }
    if (typeof value === "object" && value !== null) {
        for (const [property, raw] of Object.entries(value as Record<string, unknown>)) {
            if (raw === null || raw === undefined) {
                continue;
            }
            const propertyName = toKebabCase(property);
            const text = typeof raw === "number" && !UNITLESS.has(property) ? `${raw}px` : String(raw);
            element.style.setProperty(propertyName, text);
        }
    }
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
        parent.appendChild(renderDynamic(child));
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

    createEffect(() => {
        const next = toNodes(read());
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
function toNodes(value: Child): Node[] {
    const resolved = resolveChild(value);
    if (resolved === null || resolved === undefined || resolved === false || resolved === true) {
        return [];
    }
    if (Array.isArray(resolved)) {
        return resolved.flatMap((item) => toNodes(item));
    }
    if (resolved instanceof Node) {
        return [resolved];
    }
    return [document.createTextNode(String(resolved))];
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
