// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import {
    createContext,
    createSignal,
    ErrorBoundary,
    For,
    Fragment,
    jsx,
    onCleanup,
    onMount,
    Portal,
    render,
    setServerMode,
    Show,
    useContext,
    type Child,
} from "../src/index.js";

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

it("materializes universal nodes inserted later", () => {
    const container = document.createElement("div");
    const previous = setServerMode(true);
    let stored: Child = null;
    try {
        stored = jsx("p", { class: "stored" }, "server text");
    } finally {
        setServerMode(previous);
    }

    container.appendChild(jsx("div", null, () => stored) as Node);

    expect(container.innerHTML).toBe('<div><p class="stored">server text</p></div>');
});

it("disposes the effects of replaced dynamic content", async () => {
    const cleanup = vi.fn();
    const label = createSignal("first");
    function Leaf(props: { text: string }): Child {
        onCleanup(cleanup);
        return jsx("span", null, props.text);
    }

    const { container } = mount(() =>
        jsx("div", null, () => (label() === "first" ? "first" : jsx(Leaf, { text: label() }))),
    );

    label.set("second");
    await tick();
    expect(container.textContent).toBe("second");
    expect(cleanup).not.toHaveBeenCalled();

    label.set("third");
    await tick();
    expect(container.textContent).toBe("third");
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll("span")).toHaveLength(1);
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

describe("collections and branches", () => {
    it("reuses keyed rows and reorders them", async () => {
        const items = createSignal([
            { id: 1, text: "a" },
            { id: 2, text: "b" },
            { id: 3, text: "c" },
        ]);
        const container = document.createElement("div");

        container.appendChild(
            jsx(For, {
                each: items,
                keyBy: (item: { id: number }) => item.id,
                children: (item: { id: number; text: string }) => jsx("li", null, item.text),
            }) as Node,
        );

        const nodeA = [...container.querySelectorAll("li")].find((li) => li.textContent === "a");
        expect(container.textContent).toBe("abc");

        items.set([...items()].reverse());
        await tick();

        expect(container.textContent).toBe("cba");
        expect([...container.querySelectorAll("li")].find((li) => li.textContent === "a")).toBe(nodeA);
    });

    it("updates a row in place when the item changes under the same key", async () => {
        const first = { id: 1, text: "a" };
        const items = createSignal([first]);
        const container = document.createElement("div");

        container.appendChild(
            jsx(For, {
                each: items,
                keyBy: (item: { id: number }) => item.id,
                children: (item: { id: number; text: string }) => jsx("li", null, () => item.text),
            }) as Node,
        );

        const row = container.querySelector("li");
        items.set([{ id: 1, text: "updated" }]);
        await tick();

        expect(container.textContent).toBe("updated");
        expect(container.querySelector("li")).toBe(row);
    });

    it("disposes item effects when a row is removed", async () => {
        const cleanup = vi.fn();

        function Row(props: { item: { id: number; text: string } }): Child {
            return jsx("li", null, () => {
                onCleanup(cleanup);
                return props.item.text;
            });
        }

        const first = { id: 1, text: "a" };
        const items = createSignal([first, { id: 2, text: "b" }]);
        const container = document.createElement("div");

        container.appendChild(
            jsx(For, {
                each: items,
                keyBy: (item: { id: number }) => item.id,
                children: (item: { id: number; text: string }) => jsx(Row, { item }),
            }) as Node,
        );

        items.set([first]);
        await tick();

        expect(container.textContent).toBe("a");
        expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it("disposes branch effects when Show hides a subtree", async () => {
        const cleanup = vi.fn();
        const visible = createSignal(true);

        function Panel(): Child {
            onCleanup(cleanup);
            return jsx("p", null, "panel");
        }

        const container = document.createElement("div");
        container.appendChild(
            jsx(Show, {
                when: visible,
                children: () => jsx(Panel, null),
            }) as Node,
        );

        visible.set(false);
        await tick();

        expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it("updates every row in place when the key order does not change", async () => {
        const initial = Array.from({ length: 50 }, (_, id) => ({ id, text: `row ${id}` }));
        const items = createSignal(initial);
        const container = document.createElement("div");

        container.appendChild(
            jsx(For, {
                each: items,
                keyBy: (item: { id: number }) => item.id,
                children: (item: { id: number; text: string }) => jsx("li", null, () => item.text),
            }) as Node,
        );

        const rows = [...container.querySelectorAll("li")];
        items.set(initial.map((row) => ({ ...row, text: `copy ${row.id}` })));
        await tick();

        const updated = [...container.querySelectorAll("li")];
        expect(updated).toHaveLength(50);
        expect(updated[0]).toBe(rows[0]);
        expect(updated[49]).toBe(rows[49]);
        expect(updated[0]?.textContent).toBe("copy 0");
        expect(updated[49]?.textContent).toBe("copy 49");
    });

    it("bulk-removes cleared rows without touching sibling content", async () => {
        const items = createSignal(Array.from({ length: 40 }, (_, id) => ({ id, text: `row ${id}` })));
        const container = document.createElement("div");
        const title = jsx("h1", null, "list") as Node;

        container.appendChild(title);
        container.appendChild(
            jsx(For, {
                each: items,
                keyBy: (item: { id: number }) => item.id,
                children: (item: { id: number; text: string }) => jsx("li", null, item.text),
            }) as Node,
        );

        expect(container.querySelectorAll("li")).toHaveLength(40);
        items.set([]);
        await tick();

        expect(container.querySelectorAll("li")).toHaveLength(0);
        expect(container.firstChild).toBe(title);
        expect(container.textContent).toBe("list");
    });

    it("renders a fallback and removes missing rows", async () => {
        const items = createSignal([{ id: 1, text: "a" }]);
        const container = document.createElement("div");

        container.appendChild(
            jsx(For, {
                each: items,
                keyBy: (item: { id: number }) => item.id,
                children: (item: { id: number; text: string }) => jsx("li", null, item.text),
                fallback: jsx("p", null, "empty"),
            }) as Node,
        );

        items.set([]);
        await tick();

        expect(container.textContent).toBe("empty");
        expect(container.querySelectorAll("li")).toHaveLength(0);
    });

    it("switches branches with Show", async () => {
        const visible = createSignal(true);
        const container = document.createElement("div");

        container.appendChild(
            jsx(Show, {
                when: visible,
                children: jsx("p", null, "on"),
                fallback: jsx("p", null, "off"),
            }) as Node,
        );

        expect(container.textContent).toBe("on");

        visible.set(false);
        await tick();
        expect(container.textContent).toBe("off");
    });

    it("renders a portal into another element and cleans it up", () => {
        const target = document.createElement("div");
        const { dispose } = mount(() =>
            jsx(Portal, {
                mount: target,
                children: (() => {
                    const element = document.createElement("span");
                    element.textContent = "modal";
                    return element;
                })(),
            }),
        );

        expect(target.textContent).toBe("modal");

        dispose();
        expect(target.childNodes).toHaveLength(0);
    });

    it("catches mount errors with an error boundary", () => {
        function Boom(): Child {
            throw new Error("boom");
        }

        const container = document.createElement("div");
        container.appendChild(
            jsx(ErrorBoundary, {
                fallback: (error: Error) => jsx("p", null, error.message),
                children: () => jsx(Boom, null),
            }) as Node,
        );

        expect(container.textContent).toBe("boom");
    });
});

describe("attributes and namespaces", () => {
    it("creates SVG elements in the SVG namespace", () => {
        const svg = jsx("svg", { viewBox: "0 0 10 10" }, jsx("circle", { cx: 5, cy: 5, r: 4 })) as Element;

        expect(svg.namespaceURI).toBe("http://www.w3.org/2000/svg");
        expect(svg.firstChild).toBeInstanceOf(SVGElement);
    });

    it("removes style properties that disappear", async () => {
        const bordered = createSignal(true);
        const element = jsx("div", {
            style: () => (bordered() ? { color: "red", borderWidth: 2 } : { color: "red" }),
        }) as HTMLElement;

        expect(element.style.borderWidth).toBe("2px");

        bordered.set(false);
        await tick();

        expect(element.style.borderWidth).toBe("");
        expect(element.style.color).toBe("red");
    });

    it("supports capture-phase event handlers", () => {
        let captured = 0;
        const container = document.createElement("div");

        container.appendChild(
            jsx("div", { onClickCapture: () => (captured += 1) }, jsx("button", { onClick: () => undefined }, "go")),
        );

        (container.querySelector("button") as HTMLButtonElement).click();
        expect(captured).toBe(1);
    });

    it("keeps context reactive when the provider holds a signal", async () => {
        const Theme = createContext(createSignal("light"));

        function Panel(): Child {
            const theme = useContext(Theme);
            return jsx("span", null, () => theme());
        }

        const theme = createSignal("light");
        const container = document.createElement("div");
        container.appendChild(jsx(Theme.Provider, { value: theme }, () => jsx(Panel, null)) as Node);

        expect(container.textContent).toBe("light");

        theme.set("dark");
        await tick();
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
