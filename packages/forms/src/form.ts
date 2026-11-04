import { createComputed, createSignal } from "@kyneticweb/reactive";
import type { FieldBinding, Form, FormErrors, FormOptions, FormValues } from "./types.js";

/** Copies a values object without sharing the top-level reference. */
function cloneValues<V extends FormValues>(values: V): V {
    return { ...values } as V;
}

/** Creates a form. */
class FormManager<V extends FormValues> implements Form<V> {
    public readonly values;
    public readonly errors;
    public readonly touched;
    public readonly submitting;
    public readonly formError;
    public readonly valid;

    readonly #initialValues: V;
    readonly #validate: (values: V) => FormErrors<V>;
    readonly #onSubmit: ((values: V) => void | Promise<void>) | undefined;

    public constructor(options: FormOptions<V>) {
        this.#initialValues = cloneValues(options.initialValues);
        this.#validate = options.validate ?? (() => ({}));
        this.#onSubmit = options.onSubmit;

        this.values = createSignal<V>(cloneValues(this.#initialValues));
        this.errors = createSignal<FormErrors<V>>({});
        this.touched = createSignal<Partial<Record<keyof V & string, boolean>>>({});
        this.submitting = createSignal(false);
        this.formError = createSignal<string | null>(null);
        this.valid = createComputed(() => Object.keys(this.#validate(this.values())).length === 0);
    }

    /** Writes one value, clearing its previous error. */
    public setValue<K extends keyof V & string>(name: K, value: V[K]): void {
        this.values.update((current) => ({ ...current, [name]: value }) as V);
        this.errors.update((current) => {
            if (!(name in current)) {
                return current;
            }
            const next = { ...current };
            delete next[name];
            return next;
        });
    }

    /** Sets or clears one error. */
    public setError(name: keyof V & string, message?: string): void {
        this.errors.update((current) => {
            const next = { ...current };
            if (message === undefined) {
                delete next[name];
            } else {
                next[name] = message;
            }
            return next;
        });
    }

    /** Creates a field binding. */
    public field<K extends keyof V & string>(
        name: K,
        options?: { readonly parse?: (raw: string) => V[K]; readonly id?: string },
    ): FieldBinding<V[K]> {
        const parse = options?.parse ?? ((raw: string) => raw as V[K]);
        const errorId = options?.id === undefined ? undefined : `${options.id}-error`;

        const set = (value: V[K]): void => {
            this.setValue(name, value);
        };
        const touch = (): void => {
            this.touched.update((current) => ({ ...current, [name]: true }));
            this.errors.set(this.#validate(this.values()));
        };

        return {
            value: () => this.values()[name],
            error: () => this.errors()[name],
            touched: () => this.touched()[name] === true,
            invalid: () => this.errors()[name] !== undefined,
            set,
            touch,
            inputProps: {
                value: () => {
                    const value = this.values()[name];
                    return value === null || value === undefined ? "" : String(value);
                },
                onInput: (event: InputEvent) => {
                    const target = event.target as HTMLInputElement | null;
                    set(parse(target?.value ?? ""));
                },
                onBlur: touch,
                "aria-invalid": () => this.errors()[name] !== undefined,
                ...(errorId === undefined
                    ? {}
                    : { "aria-describedby": () => (this.errors()[name] ? errorId : undefined) }),
            },
            checkboxProps: {
                checked: () => Boolean(this.values()[name]),
                onChange: (event: Event) => {
                    const target = event.target as HTMLInputElement | null;
                    set(Boolean(target?.checked) as V[K]);
                },
                onBlur: touch,
                "aria-invalid": () => this.errors()[name] !== undefined,
            },
        };
    }

    /** Restores the initial values and clears state. */
    public reset(values?: Partial<V>): void {
        this.values.set({ ...cloneValues(this.#initialValues), ...values } as V);
        this.errors.set({});
        this.touched.set({});
        this.formError.set(null);
    }

    /** Validates and submits. */
    public async submit(): Promise<boolean> {
        if (this.submitting()) {
            return false;
        }

        const allTouched: Partial<Record<keyof V & string, boolean>> = {};
        for (const key of Object.keys(this.values()) as Array<keyof V & string>) {
            allTouched[key] = true;
        }
        this.touched.set(allTouched);

        const errors = this.#validate(this.values());
        this.errors.set(errors);
        if (Object.keys(errors).length > 0) {
            return false;
        }

        this.formError.set(null);
        this.submitting.set(true);
        try {
            await this.#onSubmit?.(this.values());
            return true;
        } catch (error) {
            this.formError.set(error instanceof Error ? error.message : String(error));
            return false;
        } finally {
            this.submitting.set(false);
        }
    }

    /**
     * Prevents the native submit and runs {@link submit}.
     *
     * Defined as an arrow property so `onSubmit={form.handleSubmit}` keeps the
     * instance as `this`.
     */
    public readonly handleSubmit = (event: SubmitEvent): void => {
        event.preventDefault();
        void this.submit();
    };
}

/**
 * Creates a typed form.
 *
 * @example
 * ```ts
 * const form = createForm({
 *     initialValues: { email: "", age: 0 },
 *     validate: (values) => ({
 *         email: values.email.includes("@") ? undefined : "Invalid email",
 *     }),
 *     onSubmit: async (values) => save(values),
 * });
 * ```
 */
export function createForm<V extends FormValues>(options: FormOptions<V>): Form<V> {
    return new FormManager(options);
}
