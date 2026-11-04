// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSignal, jsx } from "@kyneticweb/dom";
import { renderToString } from "@kyneticweb/ssr";
import { cleanup, fireEvent, render, waitFor } from "@kyneticweb/testing";
import { Badge, Button, Card, Dialog, Spinner, Switch, Tabs } from "../src/index.js";

afterEach(cleanup);

describe("Button", () => {
    it("renders variants and calls the handler", () => {
        const onClick = vi.fn();
        const app = render(() => jsx(Button, { variant: "primary", onClick }, "Save"));

        const button = app.find("button") as HTMLButtonElement;
        expect(button.className).toContain("kyn-btn--primary");
        expect(button.textContent).toBe("Save");

        app.click(button);
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("blocks interaction while loading", () => {
        const app = render(() => jsx(Button, { loading: true }, "Save"));
        const button = app.find("button") as HTMLButtonElement;

        expect(button.disabled).toBe(true);
        expect(button.getAttribute("aria-busy")).toBe("true");
        expect(button.querySelector(".kyn-btn__spinner")).not.toBeNull();
    });

    it("renders for the server", () => {
        const html = renderToString(() => jsx(Button, { variant: "primary", loading: true }, "Save"));

        expect(html).toContain('class="kyn-btn kyn-btn--primary kyn-btn--md"');
        expect(html).toContain("disabled");
        expect(html).toContain('aria-busy="true"');
    });
});

describe("surface components", () => {
    it("renders badges and cards", () => {
        const app = render(() =>
            jsx(
                Card,
                { title: "Profile", actions: jsx(Badge, { tone: "success" }, "Active") },
                jsx("p", null, "Details"),
            ),
        );

        expect(app.find(".kyn-card__title")?.textContent).toBe("Profile");
        expect(app.find(".kyn-badge--success")?.textContent).toBe("Active");
        expect(app.text()).toBe("ProfileActiveDetails");
    });

    it("renders an accessible spinner", () => {
        const app = render(() => jsx(Spinner, { label: "Saving" }));
        const spinner = app.find(".kyn-spinner");

        expect(spinner?.getAttribute("role")).toBe("status");
        expect(spinner?.getAttribute("aria-label")).toBe("Saving");
    });
});

describe("Switch", () => {
    it("toggles through the native checkbox", async () => {
        const checked = createSignal(false);
        const onChange = vi.fn((next: boolean) => checked.set(next));
        const app = render(() => jsx(Switch, { checked, onChange, label: "Notifications" }));

        const input = app.find("input") as HTMLInputElement;
        expect(input.checked).toBe(false);
        expect(app.text()).toBe("Notifications");

        app.check("input");
        await app.flush();

        expect(onChange).toHaveBeenCalledWith(true);
        expect(input.checked).toBe(true);
    });

    it("renders for the server", () => {
        const html = renderToString(() => jsx(Switch, { checked: true, label: "On" }));

        expect(html).toContain('type="checkbox"');
        expect(html).toContain("checked");
        expect(html).toContain("On");
    });
});

describe("Dialog", () => {
    it("renders nothing while closed and content when open", () => {
        const open = createSignal(false);
        const app = render(() => jsx(Dialog, { open, title: "Delete", onClose: () => open.set(false) }, "Body"));

        expect(app.find('[role="dialog"]')).toBeNull();

        open.set(true);

        return waitFor(() => app.find('[role="dialog"]')).then((dialog) => {
            if (dialog === null) {
                throw new Error("dialog did not open");
            }
            expect(dialog.getAttribute("aria-label")).toBe("Delete");
            expect(dialog.getAttribute("aria-modal")).toBe("true");
            expect(app.text()).toContain("Body");
        });
    });

    it("closes on Escape and on a backdrop click", async () => {
        const open = createSignal(true);
        const onClose = vi.fn(() => open.set(false));
        const app = render(() => jsx(Dialog, { open, title: "Delete", onClose }, "Body"));
        await app.flush();

        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        expect(onClose).toHaveBeenCalledTimes(1);

        onClose.mockClear();
        const backdrop = app.find(".kyn-dialog__backdrop") as HTMLElement;
        fireEvent.click(backdrop);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("moves focus inside and restores it on close", async () => {
        const open = createSignal(false);
        const opener = document.createElement("button");
        document.body.appendChild(opener);
        opener.focus();

        const app = render(() => jsx(Dialog, { open, title: "Profile" }, "Body"));
        open.set(true);
        await app.flush();
        await Promise.resolve();

        const dialog = app.find('[role="dialog"]') as HTMLElement;
        expect(document.activeElement).toBe(dialog);

        open.set(false);
        await app.flush();
        expect(document.activeElement).toBe(opener);

        opener.remove();
    });
});

describe("Tabs", () => {
    const items = [
        { id: "overview", label: "Overview", content: jsx("p", null, "Overview panel") },
        { id: "billing", label: "Billing", content: jsx("p", null, "Billing panel") },
    ] as const;

    it("switches panels and wires ARIA", async () => {
        const app = render(() => jsx(Tabs, { items }));

        const tabs = app.findAll('[role="tab"]') as HTMLElement[];
        expect(tabs).toHaveLength(2);
        expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
        expect(app.find('[role="tabpanel"]')?.textContent).toBe("Overview panel");

        app.click(tabs[1] as HTMLElement);
        await app.flush();

        expect(tabs[0]?.getAttribute("aria-selected")).toBe("false");
        expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");
        expect(app.find('[role="tabpanel"]')?.textContent).toBe("Billing panel");
    });

    it("moves with arrow keys", async () => {
        const app = render(() => jsx(Tabs, { items }));
        const tabs = app.findAll('[role="tab"]') as HTMLElement[];

        tabs[0]?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
        await app.flush();

        expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");
        expect(document.activeElement).toBe(tabs[1]);
    });

    it("renders for the server", () => {
        const html = renderToString(() =>
            jsx(Tabs, {
                items: [
                    { id: "overview", label: "Overview", content: jsx("p", null, "Overview panel") },
                    { id: "billing", label: "Billing", content: jsx("p", null, "Billing panel") },
                ],
            }),
        );

        expect(html).toContain('role="tablist"');
        expect(html).toContain('aria-selected="true"');
        expect(html).toContain("Overview panel");
    });
});
