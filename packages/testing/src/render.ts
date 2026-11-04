import { render as renderDom } from "@kyneticweb/dom";
import { change, check, click, input, keyDown, resolveTarget, submit } from "./events.js";
import { flush } from "./flush.js";
import type { RenderOptions, Target, TestApp, TestComponent, TextMatcher } from "./types.js";

/** Mounted apps, so `cleanup()` can release every one of them. */
const mounted = new Set<MountedApp>();

interface MountedApp {
    readonly container: HTMLElement;
    readonly owned: boolean;
    dispose(): void;
}

/**
 * Mounts a component in a test container.
 *
 * The default container is a fresh `div` appended to `document.body`; it is
 * removed on `dispose()` or `cleanup()`. The environment must provide a DOM
 * (happy-dom, jsdom or a real browser).
 *
 * @param component Root component.
 * @param options Optional existing container.
 * @returns Queries and actions for the mounted tree.
 *
 * @example
 * ```ts
 * const app = render(() => <Counter />);
 * app.click("button");
 * await app.flush();
 * expect(app.getByText("1")).toBeDefined();
 * ```
 */
export function render(component: TestComponent, options: RenderOptions = {}): TestApp {
    const provided = options.container;
    const owned = provided === undefined;
    const container = (provided as HTMLElement | undefined) ?? document.createElement("div");
    if (owned) {
        document.body.appendChild(container);
    }

    const disposeDom = renderDom(component, container);
    let disposed = false;
    const entry: MountedApp = {
        container,
        owned,
        dispose() {
            if (disposed) {
                return;
            }
            disposed = true;
            disposeDom();
            mounted.delete(entry);
            if (owned) {
                container.remove();
            }
        },
    };
    mounted.add(entry);

    return {
        container,
        dispose: entry.dispose,
        html: () => container.innerHTML,
        text: () => (container.textContent ?? "").trim(),
        find: (selector) => container.querySelector(selector),
        findAll: (selector) => [...container.querySelectorAll(selector)],
        getByText: (matcher) => {
            const element = queryByText(container, matcher);
            if (element === null) {
                throw new Error(`No element with text ${describeMatcher(matcher)}.`);
            }
            return element;
        },
        queryByText: (matcher) => queryByText(container, matcher),
        queryAllByText: (matcher) => queryAllByText(container, matcher),
        click: (target: Target) => {
            click(resolveTarget(container, target));
        },
        input: (target: Target, value: string) => {
            input(resolveTarget(container, target), value);
        },
        change: (target: Target, value?: string | boolean) => {
            change(resolveTarget(container, target), value);
        },
        submit: (target: Target) => {
            submit(resolveTarget(container, target));
        },
        keyDown: (target: Target, key: string) => {
            keyDown(resolveTarget(container, target), key);
        },
        check: (target: Target, checked = true) => {
            check(resolveTarget(container, target), checked);
        },
        flush,
    };
}

/**
 * Unmounts every app created with {@link render}.
 *
 * Call it from `afterEach` to keep tests isolated.
 */
export function cleanup(): void {
    for (const entry of [...mounted]) {
        entry.dispose();
    }
    mounted.clear();
}

/** Returns the deepest element whose text matches. */
function queryByText(container: Element, matcher: TextMatcher): Element | null {
    const matches = queryAllByText(container, matcher);
    for (const element of matches) {
        if (!matches.some((other) => other !== element && element.contains(other))) {
            return element;
        }
    }
    return null;
}

/** Returns every element whose text matches, including ancestors. */
function queryAllByText(container: Element, matcher: TextMatcher): Element[] {
    const matches: Element[] = [];
    for (const element of container.querySelectorAll("*")) {
        if (matchesText(element, matcher)) {
            matches.push(element);
        }
    }
    return matches;
}

/** Compares an element's normalized text with a matcher. */
function matchesText(element: Element, matcher: TextMatcher): boolean {
    const text = (element.textContent ?? "").replace(/\s+/g, " ").trim();
    if (typeof matcher === "string") {
        return text === matcher;
    }
    matcher.lastIndex = 0;
    return matcher.test(text);
}

/** Human-readable matcher for error messages. */
function describeMatcher(matcher: TextMatcher): string {
    return typeof matcher === "string" ? JSON.stringify(matcher) : String(matcher);
}
