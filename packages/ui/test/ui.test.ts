// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSignal, jsx, type Child } from "@kyneticweb/dom";
import { renderToString } from "@kyneticweb/ssr";
import { cleanup, fireEvent, render, waitFor } from "@kyneticweb/testing";
import {
    Badge,
    Button,
    Card,
    Checkbox,
    Dialog,
    Input,
    Menu,
    RadioGroup,
    Select,
    Spinner,
    Switch,
    Table,
    Tabs,
    Textarea,
} from "../src/index.js";
import type { TableProps } from "../src/index.js";

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

describe("form controls", () => {
    it("renders inputs with label, value and error", async () => {
        const email = createSignal("");
        const error = (): string | undefined => (email().includes("@") ? undefined : "Invalid email");
        const app = render(() =>
            jsx(Input, {
                label: "Email",
                type: "email",
                value: email,
                error,
                hint: "We never share it",
                onInput: (event: InputEvent) => email.set((event.target as HTMLInputElement).value),
            }),
        );

        const input = app.find("input") as HTMLInputElement;
        expect(input.type).toBe("email");
        expect(app.text()).toContain("Email");
        expect(app.text()).toContain("We never share it");
        expect(app.find(".kyn-field__error")?.textContent).toBe("Invalid email");
        expect(input.getAttribute("aria-invalid")).toBe("true");

        app.input(input, "a@b.c");
        await app.flush();

        expect(email()).toBe("a@b.c");
        expect(app.find(".kyn-field__error")).toBeNull();
    });

    it("renders textareas and serializes their value as content", async () => {
        const bio = createSignal("hello");
        const app = render(() =>
            jsx(Textarea, {
                label: "Bio",
                rows: 4,
                value: bio,
                onInput: (event: InputEvent) => bio.set((event.target as HTMLTextAreaElement).value),
            }),
        );

        const area = app.find("textarea") as HTMLTextAreaElement;
        expect(area.value).toBe("hello");
        expect(area.getAttribute("rows")).toBe("4");

        app.input(area, "world");
        await app.flush();
        expect(bio()).toBe("world");

        const html = renderToString(() => jsx(Textarea, { value: "server text", rows: 2 }));
        expect(html).toContain(">server text</textarea>");
        expect(html).not.toContain('value="server text"');
    });

    it("toggles checkboxes and selects radios", async () => {
        const accepted = createSignal(false);
        const check = render(() => jsx(Checkbox, { checked: accepted, onChange: accepted.set, label: "Accept" }));
        const box = check.find("input") as HTMLInputElement;
        expect(check.find(".kyn-check__label")?.textContent).toBe("Accept");

        check.check(box);
        await check.flush();
        expect(accepted()).toBe(true);

        const plan = createSignal("free");
        const radios = render(() =>
            jsx(RadioGroup, {
                name: "plan",
                label: "Plan",
                value: plan,
                onChange: plan.set,
                options: [
                    { value: "free", label: "Free" },
                    { value: "pro", label: "Pro" },
                ],
            }),
        );
        const inputs = radios.findAll('input[type="radio"]') as HTMLInputElement[];
        expect(inputs[0]?.checked).toBe(true);

        radios.check(inputs[1] as HTMLInputElement);
        await radios.flush();

        expect(plan()).toBe("pro");
        expect(inputs[1]?.checked).toBe(true);
    });
});

describe("Select", () => {
    const items = [
        {
            label: "Europe",
            options: [
                { value: "es", label: "Spain" },
                { value: "fr", label: "France" },
            ],
        },
        { label: "America", options: [{ value: "mx", label: "Mexico" }] },
    ];

    it("opens, filters by search and selects an option", async () => {
        const value = createSignal("");
        const app = render(() =>
            jsx(Select, {
                items,
                value,
                onChange: value.set,
                searchable: true,
                clearable: true,
                label: "Country",
            }),
        );

        expect(app.find('[role="listbox"]')).toBeNull();

        app.click(".kyn-select__trigger");
        await app.flush();
        await app.flush();

        expect(app.find('[role="listbox"]')).not.toBeNull();
        expect(app.text()).toContain("Europe");

        const search = app.find(".kyn-select__search") as HTMLInputElement;
        app.input(search, "mex");
        await app.flush();

        const visible = app.findAll('[role="option"]').filter((option) => !option.hasAttribute("hidden"));
        expect(visible).toHaveLength(1);
        expect(visible[0]?.textContent).toContain("Mexico");

        app.click(visible[0] as Element);
        await app.flush();

        expect(value()).toBe("mx");
        expect(app.find(".kyn-select__trigger")?.textContent).toContain("Mexico");
    });

    it("selects with the keyboard", async () => {
        const value = createSignal("");
        const app = render(() => jsx(Select, { items, value, onChange: value.set }));

        app.click(".kyn-select__trigger");
        await app.flush();
        await app.flush();

        const list = app.find('[role="listbox"]') as HTMLElement;
        list.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        await app.flush();

        expect(value()).toBe("es");
    });

    it("clears the selection", async () => {
        const value = createSignal("fr");
        const app = render(() => jsx(Select, { items, value, onChange: value.set, clearable: true }));

        await app.flush();
        app.click(".kyn-select__clear");
        await app.flush();

        expect(value()).toBe("");
    });
});

describe("Menu", () => {
    it("selects an item and closes", async () => {
        const selected = vi.fn();
        const app = render(() =>
            jsx(Menu, {
                label: "Actions",
                items: [
                    { id: "edit", label: "Edit", onSelect: selected },
                    { id: "delete", label: "Delete", danger: true, separatorBefore: true },
                ],
            }),
        );

        app.click(".kyn-menu__trigger");
        await app.flush();
        await app.flush();

        const entries = app.findAll('[role="menuitem"]');
        expect(entries).toHaveLength(2);

        app.click(entries[0] as Element);
        await app.flush();

        expect(selected).toHaveBeenCalledTimes(1);
        expect(app.find(".kyn-menu__panel")).toBeNull();
    });

    it("closes on Escape", async () => {
        const app = render(() => jsx(Menu, { label: "Actions", items: [{ id: "a", label: "A" }] }));

        app.click(".kyn-menu__trigger");
        await app.flush();
        await app.flush();
        expect(app.find('[role="menu"]')).not.toBeNull();

        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        await app.flush();

        expect(app.find('[role="menu"]')).toBeNull();
    });
});

describe("Table", () => {
    interface Person {
        readonly name: string;
        readonly age: number;
    }

    const columns = [
        { key: "name", header: "Name", sortable: true },
        { key: "age", header: "Age", align: "end" as const },
    ];
    const people: Person[] = [
        { name: "B", age: 2 },
        { name: "A", age: 1 },
    ];

    const renderTable = (props: TableProps<Person>): Child => jsx(Table<Person>, props);

    it("renders rows and sorts on click", async () => {
        const app = render(() => renderTable({ columns, rows: people }));

        expect(app.findAll("tbody tr")).toHaveLength(2);
        expect(app.find("tbody tr td")?.textContent).toBe("B");

        const sort = app.find(".kyn-table__sort") as HTMLButtonElement;
        sort.click();
        await app.flush();

        expect(app.find("tbody tr td")?.textContent).toBe("A");
        expect(sort.closest("th")?.getAttribute("aria-sort")).toBe("ascending");

        sort.click();
        await app.flush();

        expect(app.find("tbody tr td")?.textContent).toBe("B");
        expect(sort.closest("th")?.getAttribute("aria-sort")).toBe("descending");
    });

    it("shows an empty state and handles row clicks", async () => {
        const onRowClick = vi.fn();
        const app = render(() => renderTable({ columns, rows: [], onRowClick }));

        expect(app.find(".kyn-table__empty")?.textContent).toBe("No data");

        cleanup();
        const filled = render(() => renderTable({ columns, rows: people, onRowClick }));
        filled.click("tbody tr");
        expect(onRowClick).toHaveBeenCalledWith(people[0]);
    });
});
