import type { Child } from "@kyneticweb/dom";
import { cx, read } from "./classes.js";

/** Props accepted by {@link Switch}. */
export interface SwitchProps {
    /** Current state, or an accessor for reactive state. */
    readonly checked: boolean | (() => boolean);
    /** Called with the next state when the user toggles it. */
    readonly onChange?: (checked: boolean) => void;
    /** Visible label. The input is wrapped by it, so no id is needed. */
    readonly label?: Child;
    readonly disabled?: boolean | (() => boolean);
    readonly class?: string;
}

/**
 * Accessible toggle built on a native checkbox.
 *
 * @example
 * ```tsx
 * <Switch checked={enabled} onChange={enabled.set} label="Notifications" />
 * ```
 */
export function Switch(props: SwitchProps): Child {
    const checked = (): boolean => read(props.checked) === true;
    const disabled = (): boolean => read(props.disabled) === true;
    const onChange = (event: Event): void => {
        const target = event.target as HTMLInputElement | null;
        props.onChange?.(target?.checked === true);
    };

    return (
        <label class={cx("kyn-switch", props.class)}>
            <input
                type="checkbox"
                class="kyn-switch__input"
                checked={checked}
                disabled={disabled}
                onChange={onChange}
            />
            <span class="kyn-switch__track" aria-hidden="true">
                <span class="kyn-switch__thumb" />
            </span>
            {props.label !== undefined ? <span class="kyn-switch__label">{props.label}</span> : null}
        </label>
    );
}
