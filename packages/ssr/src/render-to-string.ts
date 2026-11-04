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

/**
 * Renders a component tree to an HTML string without a DOM.
 *
 * The same components, `<For>`, `<Show>`, context and error boundaries used on
 * the client work here. Effects and `onMount` are skipped on the server, so
 * DOM side effects must live in those hooks.
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
        const markup = renderValue(component());
        return options.doctype === true ? `<!doctype html>${markup}` : markup;
    } finally {
        setDomServerMode(previousDom);
        setReactiveServerMode(previousReactive);
    }
}

/** Renders any child value. */
function renderValue(value: unknown): string {
    if (value === null || value === undefined || value === false || value === true) {
        return "";
    }
    if (typeof value === "function") {
        return renderValue(value());
    }
    if (Array.isArray(value)) {
        return value.map((item) => renderValue(item)).join("");
    }
    if (isVNode(value)) {
        return renderNode(value);
    }
    if (typeof value === "string" || typeof value === "number") {
        return escapeText(String(value));
    }
    throw new Error(`Cannot render value of type "${typeof value}" on the server.`);
}

/** Renders one server node. */
function renderNode(node: VNode): string {
    switch (node.kind) {
        case "element":
            return renderElement(node);
        case "component": {
            const props = { ...node.props };
            if (node.children.length === 1) {
                props["children"] = node.children[0];
            } else if (node.children.length > 1) {
                props["children"] = node.children;
            }
            return renderValue((node.component as (props: Record<string, unknown>) => unknown)(props));
        }
        case "fragment":
            return renderValue(node.children);
        case "each": {
            const items = typeof node.each === "function" ? node.each() : node.each;
            if (items.length === 0) {
                return renderValue(node.fallback);
            }
            return items.map((item, index) => renderValue(node.render(item, index))).join("");
        }
        case "when": {
            const visible = typeof node.when === "function" ? node.when() : node.when;
            return renderValue(visible ? node.children : node.fallback);
        }
        case "portal":
            return renderValue(node.children);
        case "provider":
            return node.context.runWith(node.value, () => renderValue(node.children));
        case "boundary": {
            try {
                return renderValue(node.children);
            } catch (error) {
                return renderValue(
                    node.fallback(error instanceof Error ? error : new Error(String(error)), () => undefined),
                );
            }
        }
    }
}

/** Renders one element and its children. */
function renderElement(node: Extract<VNode, { kind: "element" }>): string {
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
    const content = innerHTML ?? renderValue(node.children);
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
