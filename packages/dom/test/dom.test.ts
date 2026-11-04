// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { createContext, createSignal, Fragment, jsx, onMount, render, useContext, type Child } from "../src/index.js";

async function tick(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
}

function mount(component: () => Child): { container: HTMLDivElement; dispose: () => void } {
    const container = document.createElement("div");
    const dispose = render(component, container);
    return { container, dispose };
}

describe("jsx elements", () => {
    it("creates elements with attributes and children", () => {
        const tree = jsx("div", { class: "box", id: "app" }, jsx("span", null, "hello"));

        const container = document.createElement("div");
        container.appendChild(tree);

        expect(container.querySelector("div")?.className).toBe("box");
        expect(container.textContent).toBe("hello");
    });

    it("supports class maps, arrays and style objects", () => {
        const container = document.createElement("div");
        container.appendChild(
            jsx("div", {
                class: { active: true, hidden: false },
                style: { backgroundColor: "red", zIndex: 3, opacity: 0.5 },
            }),
        );

        const element = container.querySelector("div") as HTMLDivElement;
        expect(element.className).toBe("active");
        expect(element.style.backgroundColor).toBe("red");
        expect(element.style.zIndex).toBe("3");
        expect(element.style.opacity).toBe("0.5");
    });

    it("renders fragments and arrays", () => {
        const tree = jsx(Fragment, null, "a", ["b", "c"]);
        const container = document.createElement("div");
        container.appendChild(jsx("div", null, tree));

        expect(container.textContent).toBe("abc");
    });
});

describe("reactivity", () => {
    it("updates dynamic text without re-rendering the component", async () => {
        const count = createSignal(0);
        const container = document.createElement("div");

        container.appendChild(jsx("button", null, () => `Count: ${count()}`));
        expect(container.textContent).toBe("Count: 0");

        count.set(1);
        await tick();

        expect(container.textContent).toBe("Count: 1");
    });

    it("updates dynamic attributes", async () => {
        const active = createSignal(false);
        const element = jsx("div", { class: () => (active() ? "on" : "off") }) as Element;

        expect(element.getAttribute("class")).toBe("off");

        active.set(true);
        await tick();

        expect(element.getAttribute("class")).toBe("on");
    });

    it("rebuilds a mapped list when its signal changes", async () => {
        const items = createSignal(["a", "b"]);
        const container = document.createElement("div");

        container.appendChild(jsx("ul", null, () => items().map((item) => jsx("li", null, item))));
        expect(container.querySelectorAll("li")).toHaveLength(2);

        items.set(["a", "b", "c"]);
        await tick();

        expect(container.textContent).toBe("abc");
    });
});

describe("events", () => {
    it("attaches listeners and updates state", async () => {
        const count = createSignal(0);
        const container = document.createElement("div");

        container.appendChild(jsx("button", { onClick: () => count.set(count() + 1) }, () => `Count: ${count()}`));

        (container.querySelector("button") as HTMLButtonElement).click();
        await tick();

        expect(container.textContent).toBe("Count: 1");
    });
});

describe("components", () => {
    it("passes props and children", () => {
        function Item(props: { label: string }): Child {
            return jsx("span", null, props.label);
        }

        function Wrapper(props: { children?: Child }): Child {
            return jsx("section", null, props.children);
        }

        const container = document.createElement("div");
        container.appendChild(jsx(Wrapper, null, jsx(Item, { label: "inside" })) as Node);

        expect(container.querySelector("section")?.textContent).toBe("inside");
    });

    it("provides and reads context synchronously", () => {
        const Theme = createContext("light");

        function Panel(): Child {
            return jsx("p", null, useContext(Theme));
        }

        const container = document.createElement("div");
        container.appendChild(jsx(Theme.Provider, { value: "dark" }, () => jsx(Panel, null)) as Node);

        expect(container.textContent).toBe("dark");
    });
});

describe("lifecycle", () => {
    it("calls onMount after insertion", async () => {
        const mounted = vi.fn();

        function Widget(): Child {
            onMount(mounted);
            return jsx("div", null, "widget");
        }

        mount(() => jsx(Widget, null));
        expect(mounted).not.toHaveBeenCalled();

        await tick();
        expect(mounted).toHaveBeenCalledTimes(1);
    });

    it("skips onMount when disposed first", async () => {
        const mounted = vi.fn();

        function Widget(): Child {
            onMount(mounted);
            return jsx("div");
        }

        const { dispose } = mount(() => jsx(Widget, null));
        dispose();
        await tick();

        expect(mounted).not.toHaveBeenCalled();
    });

    it("cleans up the DOM and stops updates on dispose", async () => {
        const count = createSignal(0);
        const { container, dispose } = mount(() => jsx("div", null, () => `${count()}`));

        expect(container.textContent).toBe("0");

        dispose();
        count.set(1);
        await tick();

        expect(container.childNodes).toHaveLength(0);
    });

    it("calls refs with the element and null on dispose", () => {
        const ref = vi.fn();
        const { dispose } = mount(() => jsx("div", { ref }));

        expect(ref).toHaveBeenCalledWith(expect.any(HTMLDivElement));

        dispose();
        expect(ref).toHaveBeenLastCalledWith(null);
    });
});
