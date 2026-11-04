import { setDevtoolsHook, type ComponentDevtoolsEvent } from "@kyneticweb/dom";
import { getReactiveStats } from "@kyneticweb/reactive";

/** Options accepted by {@link createDevtools}. */
export interface DevtoolsOptions {
    /** Element that receives the panel. Defaults to `document.body`. */
    readonly container?: Element;
    /** Refresh interval for the stats in milliseconds. Defaults to 500. */
    readonly interval?: number;
}

/** Running development panel. */
export interface Devtools {
    /** Host element; its shadow root contains the panel. */
    readonly element: HTMLElement;
    /** Removes the panel and restores the previous devtools hook. */
    dispose(): void;
}

/** One component in the inspected tree. */
interface ComponentNode {
    readonly name: string;
    readonly parent: number | null;
    readonly children: number[];
}

/**
 * Mounts a development panel with the component tree and reactive counters.
 *
 * Call it **before** rendering the application: components register only while
 * a devtools hook is installed. The panel lives in a shadow root, so its styles
 * never leak into the page.
 *
 * @param options Panel placement and refresh interval.
 * @returns Handle that removes the panel.
 *
 * @example
 * ```ts
 * if (import.meta.env.DEV) {
 *     createDevtools();
 * }
 * ```
 */
export function createDevtools(options: DevtoolsOptions = {}): Devtools {
    const host = document.createElement("kynetic-devtools");
    host.setAttribute("data-kynetic-devtools", "");
    const shadow = host.attachShadow({ mode: "open" });

    const panel = element("section", "panel");
    const header = element("header");
    const dot = element("span", "dot");
    const title = element("strong");
    title.textContent = "Kynetic";
    const toggle = element("button", "toggle");
    toggle.type = "button";
    toggle.textContent = "−";
    toggle.setAttribute("aria-label", "Collapse devtools");
    header.append(dot, title, toggle);

    const body = element("div", "body");
    const stats = element("div", "stats");
    const treeTitle = element("div", "section-title");
    treeTitle.textContent = "Components";
    const tree = element("pre", "tree");
    body.append(stats, treeTitle, tree);
    panel.append(header, body);
    shadow.append(style(), panel);
    (options.container ?? document.body).appendChild(host);

    const nodes = new Map<number, ComponentNode>();

    const renderStats = (): void => {
        const snapshot = getReactiveStats();
        stats.replaceChildren(
            stat("signals", snapshot.signals),
            stat("memos", snapshot.computeds),
            stat("effects", snapshot.effects),
            stat("runs", snapshot.effectRuns),
            stat("pending", snapshot.pending),
            stat("components", nodes.size),
        );
    };

    const renderTree = (): void => {
        const lines: string[] = [];
        const visit = (id: number, depth: number): void => {
            const node = nodes.get(id);
            if (node === undefined) {
                return;
            }
            lines.push(`${"  ".repeat(depth)}${node.name}`);
            for (const child of node.children) {
                visit(child, depth + 1);
            }
        };
        for (const [id, node] of nodes) {
            if (node.parent === null || !nodes.has(node.parent)) {
                visit(id, 0);
            }
        }
        tree.textContent = lines.length === 0 ? "(no components)" : lines.join("\n");
    };

    const previous = setDevtoolsHook((event: ComponentDevtoolsEvent) => {
        if (event.kind === "mount") {
            nodes.set(event.id, { name: event.name, parent: event.parent, children: [] });
            if (event.parent !== null) {
                nodes.get(event.parent)?.children.push(event.id);
            }
        } else {
            nodes.delete(event.id);
        }
        renderTree();
        renderStats();
    });

    toggle.addEventListener("click", () => {
        const collapsed = body.classList.toggle("collapsed");
        toggle.textContent = collapsed ? "+" : "−";
        toggle.setAttribute("aria-label", collapsed ? "Expand devtools" : "Collapse devtools");
    });

    renderTree();
    renderStats();
    const timer = setInterval(renderStats, options.interval ?? 500);

    let disposed = false;
    return {
        element: host,
        dispose() {
            if (disposed) {
                return;
            }
            disposed = true;
            clearInterval(timer);
            setDevtoolsHook(previous);
            host.remove();
        },
    };
}

/** Creates an element with an optional class. */
function element<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (className !== undefined) {
        node.className = className;
    }
    return node;
}

/** Builds one counter cell. */
function stat(label: string, value: number): HTMLElement {
    const item = element("div", "stat");
    const number = element("span", "value");
    number.textContent = String(value);
    const caption = element("span", "label");
    caption.textContent = label;
    item.append(number, caption);
    return item;
}

/** Panel styles, isolated inside the shadow root. */
function style(): HTMLStyleElement {
    const node = document.createElement("style");
    node.textContent = `
        :host {
            position: fixed;
            right: 12px;
            bottom: 12px;
            z-index: 2147483647;
            font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            color: #e6ebff;
        }
        .panel {
            width: 280px;
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 10px;
            background: rgba(12, 16, 32, 0.94);
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);
            backdrop-filter: blur(8px);
            overflow: hidden;
        }
        header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 10px;
            background: rgba(255, 255, 255, 0.04);
        }
        .dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #6ee7a8;
            box-shadow: 0 0 8px #6ee7a8;
        }
        strong {
            flex: 1;
            font-weight: 600;
            letter-spacing: 0.04em;
        }
        .toggle {
            width: 20px;
            height: 20px;
            border: 1px solid rgba(255, 255, 255, 0.18);
            border-radius: 5px;
            background: transparent;
            color: inherit;
            font: inherit;
            line-height: 1;
            cursor: pointer;
        }
        .toggle:hover {
            background: rgba(255, 255, 255, 0.08);
        }
        .body {
            display: grid;
            gap: 10px;
            padding: 10px;
        }
        .body.collapsed {
            display: none;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 6px;
        }
        .stat {
            display: grid;
            gap: 2px;
            padding: 6px;
            border-radius: 6px;
            background: rgba(255, 255, 255, 0.04);
        }
        .value {
            font-size: 14px;
            font-weight: 700;
            color: #9ec1ff;
        }
        .label {
            color: #93a0c4;
            font-size: 10px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }
        .section-title {
            color: #93a0c4;
            font-size: 10px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }
        .tree {
            margin: 0;
            max-height: 140px;
            overflow: auto;
            white-space: pre;
            color: #cdd6f4;
        }
    `;
    return node;
}
