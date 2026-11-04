// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { jsx, render } from "@kyneticweb/dom";
import { createForm, Field } from "../src/index.js";
import type { Form } from "../src/index.js";

interface Values {
    email: string;
    age: number;
}

async function tick(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
}

function createSignupForm(onSubmit?: (values: Values) => void | Promise<void>): Form<Values> {
    return createForm<Values>({
        initialValues: { email: "", age: 0 },
        validate: (values) => {
            const errors: Partial<Record<keyof Values, string>> = {};
            if (!values.email.includes("@")) {
                errors.email = "Invalid email";
            }
            if (values.age < 18) {
                errors.age = "Too young";
            }
            return errors;
        },
        onSubmit,
    });
}

describe("createForm", () => {
    it("tracks values and validity", () => {
        const form = createSignupForm();

        expect(form.values()).toEqual({ email: "", age: 0 });
        expect(form.valid()).toBe(false);

        form.setValue("email", "a@b.c");
        expect(form.values().email).toBe("a@b.c");
        expect(form.valid()).toBe(false); // age is still invalid

        form.setValue("age", 20);
        expect(form.valid()).toBe(true);
    });

    it("validates on submit and blocks invalid forms", async () => {
        const onSubmit = vi.fn();
        const form = createSignupForm(onSubmit);

        await expect(form.submit()).resolves.toBe(false);

        expect(onSubmit).not.toHaveBeenCalled();
        expect(form.errors().email).toBe("Invalid email");
        expect(form.errors().age).toBe("Too young");
        expect(form.touched().email).toBe(true);
        expect(form.touched().age).toBe(true);
    });

    it("clears the error of a field when it changes", async () => {
        const form = createSignupForm();
        await form.submit();
        expect(form.errors().email).toBe("Invalid email");

        form.setValue("email", "a@b.c");
        expect(form.errors().email).toBeUndefined();
    });

    it("submits valid values and handles async submit", async () => {
        let release!: () => void;
        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });
        const onSubmit = vi.fn(async () => {
            await gate;
        });
        const form = createSignupForm(onSubmit);
        form.setValue("email", "a@b.c");
        form.setValue("age", 20);

        const first = form.submit();
        expect(form.submitting()).toBe(true);
        await expect(form.submit()).resolves.toBe(false);

        release();
        await expect(first).resolves.toBe(true);
        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit).toHaveBeenCalledWith({ email: "a@b.c", age: 20 });
        expect(form.submitting()).toBe(false);
    });

    it("captures submit errors", async () => {
        const form = createSignupForm(() => {
            throw new Error("network down");
        });
        form.setValue("email", "a@b.c");
        form.setValue("age", 20);

        await expect(form.submit()).resolves.toBe(false);
        expect(form.formError()).toBe("network down");
        expect(form.submitting()).toBe(false);
    });

    it("resets values, errors and touched flags", async () => {
        const form = createSignupForm();
        form.setValue("email", "a@b.c");
        await form.submit();

        form.reset();
        expect(form.values()).toEqual({ email: "", age: 0 });
        expect(form.errors()).toEqual({});
        expect(form.touched()).toEqual({});
    });
});

describe("field bindings", () => {
    it("provides input props without leaking the binding object", async () => {
        const form = createSignupForm();
        const binding = form.field("email");

        expect(binding.inputProps.value()).toBe("");
        binding.inputProps.onInput({ target: { value: "a@b.c" } } as unknown as InputEvent);
        await tick();
        expect(form.values().email).toBe("a@b.c");
        expect(binding.value()).toBe("a@b.c");
    });

    it("parses numbers", () => {
        const form = createSignupForm();
        const binding = form.field("age", { parse: Number });

        binding.inputProps.onInput({ target: { value: "42" } } as unknown as InputEvent);
        expect(form.values().age).toBe(42);
    });
});

describe("Field", () => {
    it("renders a label, input and accessible error", async () => {
        const form = createSignupForm();
        const container = document.createElement("div");

        render(() => jsx(Field, { form, name: "email", label: "Email" }), container);

        const input = container.querySelector("input") as HTMLInputElement;
        expect(container.querySelector("label")?.textContent).toBe("Email");
        expect(input.id).toBe("kynetic-field-email");
        expect(container.querySelector(".kynetic-field-error")).toBeNull();

        await form.submit();
        await tick();

        const error = container.querySelector(".kynetic-field-error");
        expect(error?.textContent).toBe("Invalid email");
        expect(input.getAttribute("aria-invalid")).toBe("");
        expect(input.getAttribute("aria-describedby")).toBe("kynetic-field-email-error");
    });

    it("wires typing and blur to the form", async () => {
        const form = createSignupForm();
        const container = document.createElement("div");

        render(() => jsx(Field, { form, name: "email", label: "Email" }), container);
        const input = container.querySelector("input") as HTMLInputElement;

        input.value = "a@b.c";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        await tick();
        expect(form.values().email).toBe("a@b.c");

        input.dispatchEvent(new Event("blur"));
        await tick();
        expect(form.touched().email).toBe(true);
    });
});
