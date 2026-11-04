// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSignal, jsx } from "@kyneticweb/dom";
import { cleanup, fireEvent, render, waitFor } from "../src/index.js";

afterEach(cleanup);

describe("render", () => {
    it("mounts into a fresh container and removes it on dispose", () => {
        const app = render(() => jsx("p", null, "hello"));

        expect(app.text()).toBe("hello");
        expect(document.body.contains(app.container)).toBe(true);

        app.dispose();
        expect(document.body.contains(app.container)).toBe(false);
    });

    it("keeps a provided container after dispose", () => {
        const container = document.createElement("div");
        document.body.appendChild(container);

        const app = render(() => jsx("span", null, "custom"), { container });
        expect(app.container).toBe(container);

        app.dispose();
        expect(document.body.contains(container)).toBe(true);
        container.remove();
    });

    it("finds elements by text and selector", () => {
        const app = render(() =>
            jsx("div", null, jsx("button", { class: "save" }, jsx("span", null, "Save")), jsx("p", null, "Other")),
        );

        expect(app.getByText("Save").tagName).toBe("SPAN");
        expect(app.queryByText(/^Oth/)?.tagName).toBe("P");
        expect(app.find(".save")).not.toBeNull();
        expect(app.findAll("span")).toHaveLength(1);
        expect(app.queryByText("missing")).toBeNull();
        expect(() => app.getByText("missing")).toThrow(/No element with text/);
    });

    it("clicks and flushes effects", async () => {
        const count = createSignal(0);
        const app = render(() =>
            jsx("button", { onClick: () => count.update((value) => value + 1) }, () => `count: ${count()}`),
        );

        app.click("button");
        app.click("button");
        await app.flush();

        expect(app.text()).toBe("count: 2");
    });

    it("types into a controlled input", async () => {
        const value = createSignal("");
        const app = render(() =>
            jsx(
                "div",
                null,
                jsx("input", {
                    value: () => value(),
                    onInput: (event: InputEvent) => value.set((event.target as HTMLInputElement).value),
                }),
                jsx("p", null, () => value()),
            ),
        );

        app.input("input", "hello");
        await app.flush();

        expect(app.text()).toBe("hello");
        expect((app.find("input") as HTMLInputElement).value).toBe("hello");
    });

    it("toggles a checkbox", async () => {
        const on = createSignal(false);
        const app = render(() =>
            jsx(
                "div",
                null,
                jsx("input", {
                    type: "checkbox",
                    checked: () => on(),
                    onChange: (event: Event) => on.set((event.target as HTMLInputElement).checked),
                }),
                jsx("p", null, () => (on() ? "on" : "off")),
            ),
        );

        app.check("input");
        await app.flush();

        expect(app.text()).toBe("on");
    });

    it("submits a form", () => {
        const submitted = vi.fn();
        const app = render(() =>
            jsx(
                "form",
                {
                    onSubmit: (event: SubmitEvent) => {
                        event.preventDefault();
                        submitted("yes");
                    },
                },
                jsx("button", { type: "submit" }, "Send"),
            ),
        );

        app.submit("form");

        expect(submitted).toHaveBeenCalledWith("yes");
    });

    it("dispatches keydown", () => {
        const keys: string[] = [];
        const app = render(() => jsx("input", { onKeyDown: (event: KeyboardEvent) => keys.push(event.key) }));

        app.keyDown("input", "Enter");

        expect(keys).toEqual(["Enter"]);
    });

    it("waits for asynchronous updates", async () => {
        const status = createSignal("idle");
        const app = render(() =>
            jsx(
                "div",
                null,
                jsx("button", { onClick: () => setTimeout(() => status.set("done"), 5) }, "Run"),
                jsx("p", null, () => status()),
            ),
        );

        app.click("button");
        await waitFor(() => app.queryByText("done"), { timeout: 300, interval: 5 });

        expect(app.text()).toBe("Rundone");
    });

    it("exposes low-level events", async () => {
        const count = createSignal(0);
        const app = render(() =>
            jsx("button", { onClick: () => count.update((value) => value + 1) }, () => String(count())),
        );

        fireEvent.click(app.find("button") as Element);
        await app.flush();

        expect(app.text()).toBe("1");
    });

    it("cleanup unmounts every app", () => {
        const first = render(() => jsx("p", null, "one"));
        const second = render(() => jsx("p", null, "two"));

        cleanup();

        expect(document.body.contains(first.container)).toBe(false);
        expect(document.body.contains(second.container)).toBe(false);
    });
});
