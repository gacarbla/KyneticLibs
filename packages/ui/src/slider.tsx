import type { Child } from "@kyneticweb/dom";
import { cx, read, sizeToken, type SizeInput } from "./classes.js";
import { fieldMessages, invalidAccessor, type FieldMessagesProps } from "./field.js";

/** Props accepted by {@link Slider}. */
export interface SliderProps extends FieldMessagesProps {
    readonly value: number | (() => number);
    readonly onChange?: (value: number) => void;
    readonly min?: number;
    readonly max?: number;
    readonly step?: number;
    readonly disabled?: boolean | (() => boolean);
    readonly size?: SizeInput;
    /** Shows the current value next to the label. Defaults to `true`. */
    readonly showValue?: boolean;
    readonly class?: string;
}

/**
 * Range slider built on a native input.
 *
 * @example
 * ```tsx
 * <Slider label="Zoom" min={0} max={200} value={zoom} onChange={zoom.set} />
 * ```
 */
export function Slider(props: SliderProps): Child {
    const value = (): number => Number(read(props.value) ?? 0);

    return (
        <label class={cx("kyn-field", props.class)}>
            {props.label !== undefined ? (
                <span class="kyn-field__label">
                    {props.label}
                    {props.showValue !== false ? (
                        <span class="kyn-slider__value">{(): string => String(value())}</span>
                    ) : null}
                </span>
            ) : null}
            <input
                class={cx("kyn-slider", `kyn-slider--${sizeToken(props.size)}`)}
                type="range"
                min={props.min ?? 0}
                max={props.max ?? 100}
                step={props.step ?? 1}
                value={value}
                disabled={() => read(props.disabled) === true}
                aria-invalid={invalidAccessor(props)}
                onInput={(event: InputEvent) => props.onChange?.(Number((event.target as HTMLInputElement).value))}
            />
            {fieldMessages(props)}
        </label>
    );
}
