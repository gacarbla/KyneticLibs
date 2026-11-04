import type { Accessor, Signal } from "@kyneticweb/reactive";

/** Values stored by a form. */
export type FormValues = object;

/** Field name → error message. */
export type FormErrors<V extends FormValues> = Partial<Record<keyof V & string, string>>;

/** Options accepted by {@link createForm}. */
export interface FormOptions<V extends FormValues> {
    /** Initial values; also used by `reset()`. */
    readonly initialValues: V;
    /** Returns the errors for the given values. */
    readonly validate?: (values: V) => FormErrors<V>;
    /** Called only when validation passes. */
    readonly onSubmit?: (values: V) => void | Promise<void>;
}

/** Props spreadable onto an `<input>` element. */
export interface InputProps {
    readonly value: () => string;
    readonly onInput: (event: InputEvent) => void;
    readonly onBlur: () => void;
    readonly "aria-invalid": () => boolean;
    readonly "aria-describedby"?: () => string | undefined;
}

/** Props spreadable onto a checkbox `<input>`. */
export interface CheckboxProps {
    readonly checked: () => boolean;
    readonly onChange: (event: Event) => void;
    readonly onBlur: () => void;
    readonly "aria-invalid": () => boolean;
}

/** Binding returned by `form.field(name)`. */
export interface FieldBinding<T> {
    /** Current value, reactive. */
    readonly value: Accessor<T>;
    /** Current error, reactive. */
    readonly error: Accessor<string | undefined>;
    /** Whether the field was blurred or submitted. */
    readonly touched: Accessor<boolean>;
    /** Whether the field has an error. */
    readonly invalid: Accessor<boolean>;
    /** Props for a text-like input. */
    readonly inputProps: InputProps;
    /** Props for a checkbox. */
    readonly checkboxProps: CheckboxProps;
    /** Writes a value. */
    set(value: T): void;
    /** Marks the field as touched and validates. */
    touch(): void;
}

/** Public form facade. */
export interface Form<V extends FormValues> {
    /** Current values, reactive. */
    readonly values: Signal<V>;
    /** Current errors, reactive. */
    readonly errors: Signal<FormErrors<V>>;
    /** Touched fields, reactive. */
    readonly touched: Signal<Partial<Record<keyof V & string, boolean>>>;
    /** Whether a submit is running. */
    readonly submitting: Signal<boolean>;
    /** Error thrown by `onSubmit`, if any. */
    readonly formError: Signal<string | null>;
    /** Whether the form has no errors. */
    readonly valid: Accessor<boolean>;
    /** Creates a binding for one field. */
    field<K extends keyof V & string>(
        name: K,
        options?: { readonly parse?: (raw: string) => V[K]; readonly id?: string },
    ): FieldBinding<V[K]>;
    /** Writes one value and clears its error. */
    setValue<K extends keyof V & string>(name: K, value: V[K]): void;
    /** Sets or clears one error. */
    setError(name: keyof V & string, message?: string): void;
    /** Restores the initial values (or a patch) and clears errors. */
    reset(values?: Partial<V>): void;
    /** Validates and calls `onSubmit`. Returns whether it succeeded. */
    submit(): Promise<boolean>;
    /** `onSubmit` handler for `<form>`. */
    handleSubmit(event: SubmitEvent): void;
}
