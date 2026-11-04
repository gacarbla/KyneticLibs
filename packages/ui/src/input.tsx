import { createSignal, type Child } from "@kyneticweb/dom";
import { cx, read, sizeToken, type SizeInput } from "./classes.js";
import { fieldMessages, invalidAccessor, type FieldMessagesProps } from "./field.js";

/** Props accepted by {@link Input}. */
export interface InputProps extends FieldMessagesProps {
    readonly type?: string;
    readonly value?: string | number | (() => string | number);
    readonly defaultValue?: string;
    readonly placeholder?: string;
    readonly name?: string;
    readonly id?: string;
    readonly autoComplete?: string;
    readonly inputMode?: string;
    readonly min?: number | string;
    readonly max?: number | string;
    readonly step?: number | string;
    readonly readOnly?: boolean;
    readonly disabled?: boolean | (() => boolean);
    readonly size?: SizeInput;
    readonly onInput?: (event: InputEvent) => void;
    readonly onChange?: (event: Event) => void;
    readonly onKeyDown?: (event: KeyboardEvent) => void;
    readonly class?: string;
}

/**
 * Labelled input with hint and error.
 *
 * Supports every native `type` (text, email, password, number, date, search,
 * tel, url…) and works controlled (`value`) or uncontrolled (`defaultValue`).
 *
 * @example
 * ```tsx
 * <Input label="Email" type="email" value={email} onInput={(event) => email.set(event.target.value)} />
 * ```
 */
export function Input(props: InputProps): Child {
    const internal = createSignal(props.defaultValue ?? "");
    const value = (): string | number => {
        if (typeof props.value === "function") {
            return props.value();
        }
        return props.value ?? internal();
    };
    const onInput = (event: InputEvent): void => {
        if (props.value === undefined) {
            internal.set((event.target as HTMLInputElement).value);
        }
        props.onInput?.(event);
    };
    const size = sizeToken(props.size);

    return (
        <label class={cx("kyn-field", props.class)}>
            {props.label !== undefined ? (
                <span class="kyn-field__label">
                    {props.label}
                    {props.required === true ? (
                        <span class="kyn-field__required" aria-hidden="true">
                            *
                        </span>
                    ) : null}
                </span>
            ) : null}
            <input
                class={cx("kyn-input", `kyn-input--${size}`)}
                type={props.type ?? "text"}
                value={value}
                placeholder={props.placeholder}
                name={props.name}
                id={props.id}
                autoComplete={props.autoComplete}
                inputMode={props.inputMode}
                min={props.min}
                max={props.max}
                step={props.step}
                required={props.required === true}
                readOnly={props.readOnly === true}
                disabled={() => read(props.disabled) === true}
                aria-invalid={invalidAccessor(props)}
                onInput={onInput}
                onChange={props.onChange}
                onKeyDown={props.onKeyDown}
            />
            {fieldMessages(props)}
        </label>
    );
}

/** Props accepted by {@link Textarea}. */
export interface TextareaProps extends FieldMessagesProps {
    readonly size?: SizeInput;
    readonly value?: string | (() => string);
    readonly defaultValue?: string;
    readonly placeholder?: string;
    readonly name?: string;
    readonly id?: string;
    readonly rows?: number;
    readonly cols?: number;
    readonly readOnly?: boolean;
    readonly disabled?: boolean | (() => boolean);
    readonly onInput?: (event: InputEvent) => void;
    readonly onKeyDown?: (event: KeyboardEvent) => void;
    readonly class?: string;
}

/**
 * Multi-line text input.
 *
 * @example
 * ```tsx
 * <Textarea label="Message" rows={4} value={message} onInput={(event) => message.set(event.target.value)} />
 * ```
 */
export function Textarea(props: TextareaProps): Child {
    const internal = createSignal(props.defaultValue ?? "");
    const value = (): string => {
        if (typeof props.value === "function") {
            return props.value();
        }
        return props.value ?? internal();
    };
    const onInput = (event: InputEvent): void => {
        if (props.value === undefined) {
            internal.set((event.target as HTMLTextAreaElement).value);
        }
        props.onInput?.(event);
    };

    return (
        <label class={cx("kyn-field", props.class)}>
            {props.label !== undefined ? (
                <span class="kyn-field__label">
                    {props.label}
                    {props.required === true ? (
                        <span class="kyn-field__required" aria-hidden="true">
                            *
                        </span>
                    ) : null}
                </span>
            ) : null}
            <textarea
                class={cx("kyn-textarea", `kyn-textarea--${sizeToken(props.size)}`)}
                value={value}
                placeholder={props.placeholder}
                name={props.name}
                id={props.id}
                rows={props.rows}
                cols={props.cols}
                required={props.required === true}
                readOnly={props.readOnly === true}
                disabled={() => read(props.disabled) === true}
                aria-invalid={invalidAccessor(props)}
                onInput={onInput}
                onKeyDown={props.onKeyDown}
            />
            {fieldMessages(props)}
        </label>
    );
}
