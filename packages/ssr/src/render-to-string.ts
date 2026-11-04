import { isVNode, setServerMode as setDomServerMode, type VNode } from "@kyneticweb/dom";
import { setServerMode as setReactiveServerMode } from "@kyneticweb/reactive";

/** HTML elements that must not have a closing tag. */
const VOID_ELEMENTS = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
]);

/** CSS properties that accept unitless numbers. */
const UNITLESS = new Set([
    "animation-iteration-count",
    "border-image-outset",
    "border-image-slice",
    "border-image-width",
    "column-count",
    "flex",
    "flex-grow",
    "flex-shrink",
    "font-weight",
    "grid-area",
    "grid-column",
    "grid-column-end",
    "grid-column-start",
    "grid-row",
    "grid-row-end",
    "grid-row-start",
    "line-height",
    "opacity",
    "order",
    "orphans",
    "scale",
    "tab-size",
    "widows",
    "z-index",
    "zoom",
]);

/** Options accepted by {@link renderToString}. */
export interface RenderOptions {
    /** Prefix the output with `<!doctype html>`. */
    readonly doctype?: boolean;
}

/** Maximum passes before `renderToStringAsync` gives up. */
const MAX_PASSES = 10;

/**
 * Renders a component tree to an HTML string without a DOM.
 *
 * The same components, `<For>`, `<Show>`, context and error boundaries used on
 * the client work here. Effects and `onMount` are skipped on the server, so
 * DOM side effects must live in those hooks.
 *
 * Pending nodes render their fallback; use {@link renderToStringAsync} when the
 * tree contains lazy work that must be resolved first.
 *
 * @param component Root component, for example `() => <App />`.
 * @param options Extra rendering options.
 * @returns HTML markup.
 *
 * @example
 * ```ts
 * const html = renderToString(() => <App />, { doctype: true });
 * ```
 */
export function renderToString(component: () => unknown, options: RenderOptions = {}): string {
    const previousDom = setDomServerMode(true);
    const previousReactive = setReactiveServerMode(true);
    try {
        const markup = renderValue(component(), null);
        return options.doctype === true ? `<!doctype html>${markup}` : markup;
    } finally {
        setDomServerMode(previousDom);
        setReactiveServerMode(previousReactive);
    }
}

/**
 * Renders a component tree, waiting for every pending node.
 *
 * Each pass is synchronous, so concurrent requests never share the server flag.
 * After a pass, the registered promises are awaited and the tree is rendered
 * again; components behind a pending boundary must cache their result so the
 * next pass renders synchronously.
 *
 * @param component Root component.
 * @param options Extra rendering options.
 * @returns HTML markup.
 * @throws {Error} When the tree does not settle after 10 passes.
 *
 * @example
 * ```ts
 * const html = await renderToStringAsync(() => <App />, { doctype: true });
 * ```
 */
export async function renderToStringAsync(component: () => unknown, options: RenderOptions = {}): Promise<string> {
    for (let pass = 0; pass < MAX_PASSES; pass += 1) {
        const tasks: Promise<unknown>[] = [];
        const markup = renderPass(component, tasks);

        if (tasks.length === 0) {
            return options.doctype === true ? `<!doctype html>${markup}` : markup;
        }
        await Promise.all(tasks);
    }
    throw new Error(
        "renderToStringAsync did not settle after 10 passes; a pending component must cache its result once its promise resolves.",
    );
}

/** Renders one synchronous pass with server mode enabled. */
function renderPass(component: () => unknown, tasks: Promise<unknown>[]): string {
    const previousDom = setDomServerMode(true);
    const previousReactive = setReactiveServerMode(true);
    try {
        return renderValue(component(), tasks);
    } finally {
        setDomServerMode(previousDom);
        setReactiveServerMode(previousReactive);
    }
}

/**
 * Renders any child value.
 *
 * @param value Child value.
 * @param tasks Collector for pending promises, or `null` for a synchronous pass.
 */
function renderValue(value: unknown, tasks: Promise<unknown>[] | null): string {
    if (value === null || value === undefined || value === false || value === true) {
        return "";
    }
    if (typeof value === "function") {
        return renderValue(value(), tasks);
    }
    if (Array.isArray(value)) {
        return value.map((item) => renderValue(item, tasks)).join("");
    }
    if (isVNode(value)) {
        return renderNode(value, tasks);
    }
    if (typeof value === "string" || typeof value === "number") {
        return escapeText(String(value));
    }
    throw new Error(`Cannot render value of type "${typeof value}" on the server.`);
}

/** Renders one server node. */
function renderNode(node: VNode, tasks: Promise<unknown>[] | null): string {
    switch (node.kind) {
        case "element":
            return renderElement(node, tasks);
        case "component": {
            const props = { ...node.props };
            if (node.children.length === 1) {
                props["children"] = node.children[0];
            } else if (node.children.length > 1) {
                props["children"] = node.children;
            }
            return renderValue((node.component as (props: Record<string, unknown>) => unknown)(props), tasks);
        }
        case "fragment":
            return renderValue(node.children, tasks);
        case "each": {
            const items = typeof node.each === "function" ? node.each() : node.each;
            if (items.length === 0) {
                return renderValue(node.fallback, tasks);
            }
            return items.map((item, index) => renderValue(node.render(item, index), tasks)).join("");
        }
        case "when": {
            const visible = typeof node.when === "function" ? node.when() : node.when;
            return renderValue(visible ? node.children : node.fallback, tasks);
        }
        case "portal":
            return renderValue(node.children, tasks);
        case "provider":
            return node.context.runWith(node.value, () => renderValue(node.children, tasks));
        case "boundary": {
            try {
                return renderValue(node.children, tasks);
            } catch (error) {
                return renderValue(
                    node.fallback(error instanceof Error ? error : new Error(String(error)), () => undefined),
                    tasks,
                );
            }
        }
        case "pending":
            tasks?.push(node.promise);
            return renderValue(node.children, tasks);
    }
}

/** Renders one element and its children. */
function renderElement(node: Extract<VNode, { kind: "element" }>, tasks: Promise<unknown>[] | null): string {
    let attributes = "";
    let innerHTML: string | undefined;

    for (const [key, value] of Object.entries(node.props)) {
        if (key === "innerHTML" || key === "html") {
            const resolved = typeof value === "function" ? (value as () => unknown)() : value;
            innerHTML = resolved === null || resolved === undefined ? "" : String(resolved);
            continue;
        }
        attributes += renderAttribute(key, value);
    }

    const tag = node.tag;
    if (VOID_ELEMENTS.has(tag)) {
        return `<${tag}${attributes}>`;
    }
    const content = innerHTML ?? renderValue(node.children, tasks);
    return `<${tag}${attributes}>${content}</${tag}>`;
}

/** Serializes one attribute. */
function renderAttribute(key: string, value: unknown): string {
    if (key === "children" || key === "key" || key === "ref" || key.startsWith("on")) {
        return "";
    }

    const resolved = typeof value === "function" ? (value as () => unknown)() : value;

    if (key === "class" || key === "className") {
        const className = classValue(resolved);
        return className.length === 0 ? "" : ` class="${escapeAttribute(className)}"`;
    }
    if (key === "style") {
        const style = styleValue(resolved);
        return style.length === 0 ? "" : ` style="${escapeAttribute(style)}"`;
    }
    if (resolved === null || resolved === undefined || resolved === false) {
        return "";
    }
    if (resolved === true) {
        return ` ${attributeName(key)}=""`;
    }
    return ` ${attributeName(key)}="${escapeAttribute(String(resolved))}"`;
}

/** Normalizes a class value. */
function classValue(value: unknown): string {
    if (typeof value === "string") {
        return value;
    }
    if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === "string" && item.length > 0).join(" ");
    }
    if (typeof value === "object" && value !== null) {
        return Object.entries(value as Record<string, unknown>)
            .filter(([, enabled]) => Boolean(enabled))
            .map(([name]) => name)
            .join(" ");
    }
    return "";
}

/** Normalizes a style value into CSS text. */
function styleValue(value: unknown): string {
    if (typeof value === "string") {
        return value;
    }
    if (typeof value !== "object" || value === null) {
        return "";
    }
    const declarations: string[] = [];
    for (const [property, raw] of Object.entries(value as Record<string, unknown>)) {
        if (raw === null || raw === undefined) {
            continue;
        }
        const name = property.startsWith("--")
            ? property
            : property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
        const text = typeof raw === "number" && !UNITLESS.has(name) ? `${raw}px` : String(raw);
        declarations.push(`${name}:${text}`);
    }
    return declarations.join(";");
}

/** Maps camelCase prop names to HTML attribute names. */
function attributeName(key: string): string {
    const aliases: Record<string, string> = {
        className: "class",
        htmlFor: "for",
        tabIndex: "tabindex",
        readOnly: "readonly",
        maxLength: "maxlength",
        colSpan: "colspan",
        rowSpan: "rowspan",
        autoComplete: "autocomplete",
        autoFocus: "autofocus",
    };
    return aliases[key] ?? key;
}

/** Escapes text content. */
function escapeText(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Escapes attribute values. */
function escapeAttribute(value: string): string {
    return escapeText(value).replace(/"/g, "&quot;");
}
