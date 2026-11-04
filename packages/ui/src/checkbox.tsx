import { createEffect, type Child } from "@kyneticweb/dom";
import { cx, read } from "./classes.js";
import { fieldMessages, invalidAccessor, type FieldMessagesProps } from "./field.js";

/** Props accepted by {@link Checkbox}. */
export interface CheckboxProps extends FieldMessagesProps {
    readonly checked: boolean | (() => boolean);
    readonly onChange?: (checked: boolean) => void;
    readonly indeterminate?: boolean | (() => boolean);
    readonly name?: string;
    readonly value?: string;
    readonly disabled?: boolean | (() => boolean);
    readonly class?: string;
}

/**
 * Checkbox with an optional mixed state.
 *
 * @example
 * ```tsx
 * <Checkbox checked={accepted} onChange={accepted.set} label="I accept the terms" />
 * ```
 */
export function Checkbox(props: CheckboxProps): Child {
    let box: HTMLInputElement | null = null;

    createEffect(() => {
        if (box !== null) {
            box.indeterminate = read(props.indeterminate) === true;
        }
    });

    return (
        <label class={cx("kyn-check", props.class)}>
            <span class="kyn-check__control">
                <input
                    ref={(element) => {
                        box = element as HTMLInputElement | null;
                    }}
                    type="checkbox"
                    class="kyn-check__input"
                    name={props.name}
                    value={props.value}
                    checked={() => read(props.checked) === true}
                    disabled={() => read(props.disabled) === true}
                    aria-invalid={invalidAccessor(props)}
                    onChange={(event: Event) => props.onChange?.((event.target as HTMLInputElement).checked)}
                />
                <span class="kyn-check__box" aria-hidden="true" />
            </span>
            {props.label !== undefined ? <span class="kyn-check__label">{props.label}</span> : null}
            {fieldMessages(props)}
        </label>
    );
}

/** One option of a {@link RadioGroup}. */
export interface RadioOption {
    readonly value: string;
    readonly label: Child;
    readonly disabled?: boolean;
}

/** Props accepted by {@link RadioGroup}. */
export interface RadioGroupProps extends FieldMessagesProps {
    /** Shared radio name; required for native grouping. */
    readonly name: string;
    readonly options: readonly RadioOption[];
    readonly value: string | (() => string);
    readonly onChange?: (value: string) => void;
    readonly disabled?: boolean | (() => boolean);
    readonly class?: string;
}

/**
 * Group of native radios with a shared name.
 *
 * @example
 * ```tsx
 * <RadioGroup
 *     name="plan"
 *     label="Plan"
 *     value={plan}
 *     onChange={plan.set}
 *     options={[
 *         { value: "free", label: "Free" },
 *         { value: "pro", label: "Pro" },
 *     ]}
 * />
 * ```
 */
export function RadioGroup(props: RadioGroupProps): Child {
    return (
        <fieldset class={cx("kyn-radio-group", props.class)}>
            {props.label !== undefined ? (
                <legend class="kyn-field__label">
                    {props.label}
                    {props.required === true ? (
                        <span class="kyn-field__required" aria-hidden="true">
                            *
                        </span>
                    ) : null}
                </legend>
            ) : null}
            <div class="kyn-radio-group__options">
                {props.options.map((option) => (
                    <label class="kyn-radio">
                        <input
                            type="radio"
                            class="kyn-radio__input"
                            name={props.name}
                            value={option.value}
                            checked={(): boolean => read(props.value) === option.value}
                            disabled={(): boolean => option.disabled === true || read(props.disabled) === true}
                            onChange={() => props.onChange?.(option.value)}
                        />
                        <span class="kyn-radio__dot" aria-hidden="true" />
                        <span class="kyn-radio__label">{option.label}</span>
                    </label>
                ))}
            </div>
            {fieldMessages(props)}
        </fieldset>
    );
}
