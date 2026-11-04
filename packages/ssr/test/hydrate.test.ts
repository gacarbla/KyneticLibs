// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { createContext, createSignal, For, hydrate, jsx, useContext, type Child } from "@kyneticweb/dom";
import { renderToString } from "../src/index.js";

async function tick(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
}

describe("hydrate", () => {
    it("adopts elements and updates dynamic text in place", async () => {
        const count = createSignal(0);
        function Counter(): Child {
            return jsx("p", { class: "value" }, () => `count: ${count()}`);
        }

        const container = document.createElement("div");
        container.innerHTML = renderToString(() => jsx(Counter, null));
        const paragraph = container.querySelector("p");

        hydrate(() => jsx(Counter, null), container);
        expect(container.querySelector("p")).toBe(paragraph);
        expect(container.textContent).toBe("count: 0");

        count.set(1);
        await tick();

        expect(container.querySelector("p")).toBe(paragraph);
        expect(container.textContent).toBe("count: 1");
    });

    it("adopts elements and updates dynamic attributes", async () => {
        const active = createSignal(false);
        function Badge(): Child {
            return jsx("span", { class: () => (active() ? "on" : "off") }, "badge");
        }

        const container = document.createElement("div");
        container.innerHTML = renderToString(() => jsx(Badge, null));
        const span = container.querySelector("span");

        hydrate(() => jsx(Badge, null), container);
        expect(span?.getAttribute("class")).toBe("off");

        active.set(true);
        await tick();

        expect(container.querySelector("span")).toBe(span);
        expect(span?.getAttribute("class")).toBe("on");
    });

    it("preserves context during hydration", () => {
        const Theme = createContext("light");

        function Panel(): Child {
            return jsx("p", null, useContext(Theme));
        }

        const container = document.createElement("div");
        container.innerHTML = renderToString(() => jsx(Theme.Provider, { value: "dark" }, () => jsx(Panel, null)));

        hydrate(() => jsx(Theme.Provider, { value: "dark" }, () => jsx(Panel, null)), container);

        expect(container.textContent).toBe("dark");
        expect(container.querySelector("p")).not.toBeNull();
    });

    it("attaches event handlers while adopting elements", () => {
        const onClick = vi.fn();
        function Clicker(): Child {
            return jsx("button", { onClick }, "click");
        }

        const container = document.createElement("div");
        container.innerHTML = renderToString(() => jsx(Clicker, null));
        const button = container.querySelector("button");

        hydrate(() => jsx(Clicker, null), container);
        button?.dispatchEvent(new Event("click"));

        expect(onClick).toHaveBeenCalledTimes(1);
        expect(container.querySelector("button")).toBe(button);
    });

    it("falls back to a client render for collections", async () => {
        const items = createSignal([1, 2]);
        // Manual jsx() cannot infer the generic parameter of For; TSX does.
        const h = jsx as unknown as (type: unknown, props: unknown, ...children: unknown[]) => Child;
        function List(): Child {
            return jsx(
                "ul",
                null,
                h(For, { each: items }, (item: number) => jsx("li", null, item)),
            );
        }

        const container = document.createElement("div");
        container.innerHTML = renderToString(() => jsx(List, null));
        expect(container.querySelectorAll("li")).toHaveLength(2);

        hydrate(() => jsx(List, null), container);
        expect(container.querySelectorAll("li")).toHaveLength(2);

        items.set([1, 2, 3]);
        await tick();
        expect(container.querySelectorAll("li")).toHaveLength(3);
    });

    it("replaces mismatched markup instead of crashing", () => {
        const container = document.createElement("div");
        container.innerHTML = "<p>server</p>";

        hydrate(() => jsx("div", null, "client"), container);

        expect(container.innerHTML).toBe("<div>client</div>");
    });

    it("cleans up on dispose", async () => {
        const count = createSignal(0);
        function Counter(): Child {
            return jsx("p", null, () => String(count()));
        }

        const container = document.createElement("div");
        container.innerHTML = renderToString(() => jsx(Counter, null));

        const dispose = hydrate(() => jsx(Counter, null), container);
        dispose();

        count.set(1);
        await tick();
        expect(container.childNodes).toHaveLength(0);
    });
});
