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
            const props = componentProps(node);
            return renderValue((node.component as (props: Record<string, unknown>) => unknown)(props), tasks);
        }
        case "fragment":
            return renderValue(node.children, tasks);
        case "each": {
            const items = typeof node.each === "function" ? node.each() : node.each;
            const content =
                items.length === 0
                    ? renderValue(node.fallback, tasks)
                    : items.map((item, index) => renderValue(node.render(item, index), tasks)).join("");
            return `<!--k:for-->${content}<!--/k:for-->`;
        }
        case "when": {
            const visible = typeof node.when === "function" ? node.when() : node.when;
            const content = renderValue(visible ? node.children : node.fallback, tasks);
            return `<!--k:when-->${content}<!--/k:when-->`;
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
    const { attributes, innerHTML } = elementHead(node);
    const tag = node.tag;
    if (VOID_ELEMENTS.has(tag)) {
        return `<${tag}${attributes}>`;
    }
    const content = innerHTML ?? renderValue(node.children, tasks);
    return `<${tag}${attributes}>${content}</${tag}>`;
}

/** Serializes the attributes of an element and extracts `innerHTML`. */
function elementHead(node: Extract<VNode, { kind: "element" }>): {
    attributes: string;
    innerHTML: string | undefined;
} {
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

    return { attributes, innerHTML };
}

/** Builds the props object a component receives, including children. */
function componentProps(node: Extract<VNode, { kind: "component" }>): Record<string, unknown> {
    const props = { ...node.props };
    if (node.children.length === 1) {
        props["children"] = node.children[0];
    } else if (node.children.length > 1) {
        props["children"] = node.children;
    }
    return props;
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

// ---------------------------------------------------------------------------
// Streaming
// ---------------------------------------------------------------------------

/** Context values that apply to a subtree while streaming. */
interface ServerEnv {
    readonly context: { runWith<T>(value: unknown, render: () => T): T };
    readonly value: unknown;
    readonly parent: ServerEnv | null;
}

/**
 * Runs `fn` with every provider in `env` active.
 *
 * The outermost provider is applied first so the innermost one wins, matching
 * the synchronous renderer.
 */
function runWithEnv<T>(env: ServerEnv | null, fn: () => T): T {
    if (env === null) {
        return fn();
    }
    return runFromOuter(env, fn);
}

/** Applies the parent chain before the given entry. */
function runFromOuter<T>(env: ServerEnv, fn: () => T): T {
    const inner = (): T => env.context.runWith(env.value, fn);
    return env.parent === null ? inner() : runFromOuter(env.parent, inner);
}

/**
 * Runs user code with server mode enabled and the streaming context applied.
 *
 * State is never held across an `await`, so concurrent streams cannot observe
 * each other's mode or provider stack.
 */
function invoke<T>(env: ServerEnv | null, fn: () => T): T {
    const previousDom = setDomServerMode(true);
    const previousReactive = setReactiveServerMode(true);
    try {
        return runWithEnv(env, fn);
    } finally {
        setDomServerMode(previousDom);
        setReactiveServerMode(previousReactive);
    }
}

/** Options accepted by {@link renderToStream}. */
export interface StreamOptions extends RenderOptions {
    /**
     * Emit the shell first and patch pending boundaries later with inline
     * scripts. Without it, the stream waits at each pending boundary.
     */
    readonly outOfOrder?: boolean;
}

/**
 * Renders a component tree as HTML chunks.
 *
 * The shell is emitted as soon as it is ready. In-order streaming awaits each
 * pending boundary and then renders only its subtree through `retry`. With
 * `outOfOrder`, the fallback is emitted in place and the resolved content is
 * patched by an inline script, so content after the boundary never waits.
 *
 * Use it when you need a Node stream:
 *
 * ```ts
 * Readable.from(renderChunks(() => <App />)).pipe(response);
 * ```
 *
 * @param component Root component.
 * @param options Extra rendering options.
 */
export async function* renderChunks(
    component: () => unknown,
    options: StreamOptions = {},
): AsyncGenerator<string, void, unknown> {
    if (options.outOfOrder === true) {
        yield* renderOutOfOrderChunks(component, options);
        return;
    }
    if (options.doctype === true) {
        yield "<!doctype html>";
    }
    yield* renderValueChunks(invoke(null, component), null, null);
}

/**
 * Streams a component tree as UTF-8 HTML.
 *
 * @param component Root component.
 * @param options Extra rendering options.
 * @returns A web stream of encoded chunks.
 *
 * @example
 * ```ts
 * const stream = renderToStream(() => <App />, { doctype: true, outOfOrder: true });
 * await stream.pipeTo(new WritableStream({ write: (chunk) => response.write(chunk) }));
 * ```
 */
export function renderToStream(component: () => unknown, options: StreamOptions = {}): ReadableStream<Uint8Array> {
    const chunks = renderChunks(component, options);
    const encoder = new TextEncoder();

    return new ReadableStream<Uint8Array>({
        async pull(controller) {
            const next = await chunks.next();
            if (next.done === true) {
                controller.close();
                return;
            }
            controller.enqueue(encoder.encode(next.value));
        },
        async cancel() {
            await chunks.return(undefined);
        },
    });
}

/** A pending boundary whose content is patched later. */
interface OpenBoundary {
    readonly id: number;
    readonly promise: Promise<unknown>;
    readonly retry: () => unknown;
    readonly env: ServerEnv | null;
}

/** Registry used by out-of-order streaming. */
interface BoundarySink {
    open(promise: Promise<unknown>, retry: () => unknown, env: ServerEnv | null): number;
    next(): Promise<OpenBoundary>;
    hasPending(): boolean;
    complete(): void;
}

/**
 * Collects boundaries and releases them in registration order.
 *
 * Order matters for nesting: a parent patch must land before an inner patch so
 * the inner markers are already in the document.
 */
class OutOfOrderSink implements BoundarySink {
    #nextId = 0;
    #pending = 0;
    readonly #queue: Array<{ boundary: OpenBoundary; settled: boolean }> = [];
    #waiter: (() => void) | null = null;

    public open(promise: Promise<unknown>, retry: () => unknown, env: ServerEnv | null): number {
        const id = this.#nextId++;
        this.#pending += 1;
        const entry = { boundary: { id, promise, retry, env }, settled: false };
        this.#queue.push(entry);
        const settle = (): void => {
            entry.settled = true;
            this.#waiter?.();
        };
        promise.then(settle, settle);
        return id;
    }

    public hasPending(): boolean {
        return this.#pending > 0;
    }

    public complete(): void {
        this.#pending -= 1;
    }

    public async next(): Promise<OpenBoundary> {
        for (;;) {
            const entry = this.#queue[0];
            if (entry === undefined) {
                throw new Error("No open boundary to resolve.");
            }
            if (entry.settled) {
                this.#queue.shift();
                return entry.boundary;
            }
            await new Promise<void>((resolve) => {
                this.#waiter = resolve;
            });
            this.#waiter = null;
        }
    }
}

/**
 * Hidden content plus the script that swaps it into the boundary.
 *
 * The script finds the boundary markers, removes the fallback between them and
 * moves the hidden children in place. It is self-contained, so nested patches
 * work without a global runtime.
 */
function boundaryPatch(id: number, content: string): string {
    const script =
        `(function(){var c=document.getElementById("k-c-${id}");if(!c)return;` +
        `var w=document.createTreeWalker(document.documentElement,128),n,s=null,e=null;` +
        `while(n=w.nextNode()){var d=n.data;if(d==="k:s-${id}")s=n;else if(d==="k:/s-${id}"){e=n;break;}}` +
        `if(!s||!e)return;var p=s.parentNode,q=s.nextSibling;` +
        `while(q&&q!==e){var x=q.nextSibling;p.removeChild(q);q=x;}` +
        `while(c.firstChild)p.insertBefore(c.firstChild,e);c.parentNode&&c.parentNode.removeChild(c);})();`;
    return `<div id="k-c-${id}" hidden>${content}</div><script>${script}</script>`;
}

/** Streams the shell and patches each boundary once it settles. */
async function* renderOutOfOrderChunks(
    component: () => unknown,
    options: StreamOptions,
): AsyncGenerator<string, void, unknown> {
    if (options.doctype === true) {
        yield "<!doctype html>";
    }

    const sink = new OutOfOrderSink();
    yield* renderValueChunks(invoke(null, component), null, sink);

    while (sink.hasPending()) {
        const boundary = await sink.next();
        let content = "";
        try {
            for await (const chunk of renderValueChunks(invoke(boundary.env, boundary.retry), boundary.env, sink)) {
                content += chunk;
            }
        } catch {
            // Keep the fallback that was already emitted for this boundary.
            sink.complete();
            continue;
        }
        yield boundaryPatch(boundary.id, content);
        sink.complete();
    }
}

/** Streams a child value. */
async function* renderValueChunks(
    value: unknown,
    env: ServerEnv | null,
    sink: BoundarySink | null,
): AsyncGenerator<string, void, unknown> {
    if (value === null || value === undefined || value === false || value === true) {
        return;
    }
    if (typeof value === "function") {
        yield* renderValueChunks(
            invoke(env, () => (value as () => unknown)()),
            env,
            sink,
        );
        return;
    }
    if (Array.isArray(value)) {
        for (const item of value) {
            yield* renderValueChunks(item, env, sink);
        }
        return;
    }
    if (isVNode(value)) {
        yield* renderNodeChunks(value, env, sink);
        return;
    }
    if (typeof value === "string" || typeof value === "number") {
        yield escapeText(String(value));
        return;
    }
    throw new Error(`Cannot render value of type "${typeof value}" on the server.`);
}

/** Streams one node. */
async function* renderNodeChunks(
    node: VNode,
    env: ServerEnv | null,
    sink: BoundarySink | null,
): AsyncGenerator<string, void, unknown> {
    switch (node.kind) {
        case "element": {
            const head = invoke(env, () => elementHead(node));
            if (VOID_ELEMENTS.has(node.tag)) {
                yield `<${node.tag}${head.attributes}>`;
                return;
            }
            yield `<${node.tag}${head.attributes}>`;
            if (head.innerHTML !== undefined) {
                yield head.innerHTML;
            } else {
                yield* renderValueChunks(node.children, env, sink);
            }
            yield `</${node.tag}>`;
            return;
        }
        case "component": {
            const props = componentProps(node);
            const output = invoke(env, () => (node.component as (props: Record<string, unknown>) => unknown)(props));
            yield* renderValueChunks(output, env, sink);
            return;
        }
        case "fragment":
            yield* renderValueChunks(node.children, env, sink);
            return;
        case "each": {
            const items = invoke(env, () =>
                typeof node.each === "function" ? node.each() : node.each,
            ) as readonly unknown[];
            yield "<!--k:for-->";
            if (items.length === 0) {
                yield* renderValueChunks(node.fallback, env, sink);
            } else {
                for (let index = 0; index < items.length; index += 1) {
                    const item = items[index];
                    const output = invoke(env, () => node.render(item, index));
                    yield* renderValueChunks(output, env, sink);
                }
            }
            yield "<!--/k:for-->";
            return;
        }
        case "when": {
            const visible = invoke(env, () => (typeof node.when === "function" ? node.when() : node.when));
            yield "<!--k:when-->";
            yield* renderValueChunks(visible ? node.children : node.fallback, env, sink);
            yield "<!--/k:when-->";
            return;
        }
        case "portal":
            yield* renderValueChunks(node.children, env, sink);
            return;
        case "provider":
            yield* renderValueChunks(node.children, { context: node.context, value: node.value, parent: env }, sink);
            return;
        case "boundary": {
            try {
                yield* renderValueChunks(node.children, env, sink);
            } catch (error) {
                yield* renderValueChunks(
                    node.fallback(error instanceof Error ? error : new Error(String(error)), () => undefined),
                    env,
                    sink,
                );
            }
            return;
        }
        case "pending": {
            if (node.retry === undefined) {
                throw new Error(
                    "Streaming needs createPending(promise, fallback, retry). Use renderToStringAsync for pending nodes without a retry.",
                );
            }
            if (sink === null) {
                await node.promise;
                yield* renderValueChunks(invoke(env, node.retry), env, null);
                return;
            }

            const id = sink.open(node.promise, node.retry, env);
            yield `<!--k:s-${id}-->`;
            yield* renderValueChunks(node.children, env, sink);
            yield `<!--k:/s-${id}-->`;
            return;
        }
    }
}
