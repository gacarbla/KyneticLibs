import { jsx, type Child } from "@kyneticweb/dom";
import type { Form, FormValues } from "./types.js";

/** Props accepted by {@link Field}. */
export interface FieldProps<V extends FormValues, K extends keyof V & string> {
    /** Form that owns the field. */
    readonly form: Form<V>;
    /** Field name. */
    readonly name: K;
    /** Visible label. */
    readonly label?: string;
    /** `type` attribute for the input. Defaults to `text`. */
    readonly type?: string;
    /** Placeholder text. */
    readonly placeholder?: string;
    /** Converts the raw input string to the stored value. */
    readonly parse?: (raw: string) => V[K];
    /** ID for the input. Defaults to `kynetic-field-<name>`. */
    readonly id?: string;
    /** Wrapper class. */
    readonly class?: string;
}

/**
 * Text-like field with label, accessible error and reactive binding.
 *
 * The input value and `aria-invalid` are thunks, so the element updates in
 * place when the form changes.
 *
 * @example
 * ```tsx
 * <Field form={form} name="email" label="Email" type="email" />
 * ```
 */
export function Field<V extends FormValues, K extends keyof V & string>(props: FieldProps<V, K>): Child {
    const id = props.id ?? `kynetic-field-${String(props.name)}`;
    const errorId = `${id}-error`;
    const binding = props.form.field(props.name, {
        parse: props.parse,
        id,
    });

    return jsx(
        "div",
        { class: props.class ?? "kynetic-field" },
        props.label === undefined ? null : jsx("label", { for: id, class: "kynetic-field-label" }, props.label),
        jsx("input", {
            id,
            type: props.type ?? "text",
            placeholder: props.placeholder,
            ...binding.inputProps,
        }),
        () =>
            binding.error() === undefined
                ? null
                : jsx("span", { id: errorId, class: "kynetic-field-error", role: "alert" }, binding.error()),
    );
}
