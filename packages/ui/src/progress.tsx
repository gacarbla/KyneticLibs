import type { Child } from "@kyneticweb/dom";
import { cx, read, sizeToken, type SizeInput } from "./classes.js";

/** Progress tones. */
export type ProgressTone = "accent" | "success" | "warning" | "danger";

/** Props accepted by {@link Progress}. */
export interface ProgressProps {
    /** Current value; ignored when `indeterminate` is true. */
    readonly value?: number | (() => number);
    readonly max?: number;
    readonly tone?: ProgressTone;
    readonly size?: SizeInput;
    readonly indeterminate?: boolean;
    readonly label?: string;
    /** Shows the percentage next to the label. */
    readonly showValue?: boolean;
    readonly class?: string;
}

/**
 * Determinate or indeterminate progress bar.
 *
 * @example
 * ```tsx
 * <Progress label="Upload" value={uploaded} showValue />
 * ```
 */
export function Progress(props: ProgressProps): Child {
    const max = props.max ?? 100;
    const current = (): number => Number(read(props.value) ?? 0);
    const percent = (): number => {
        if (props.indeterminate === true) {
            return 0;
        }
        return Math.max(0, Math.min(100, (current() / max) * 100));
    };

    return (
        <div
            class={cx(
                "kyn-progress",
                `kyn-progress--${sizeToken(props.size)}`,
                `kyn-progress--${props.tone ?? "accent"}`,
                props.indeterminate === true && "is-indeterminate",
                props.class,
            )}
        >
            {props.label !== undefined || props.showValue === true ? (
                <div class="kyn-progress__header">
                    {props.label !== undefined ? <span class="kyn-progress__label">{props.label}</span> : null}
                    {props.showValue === true ? (
                        <span class="kyn-progress__value">
                            {(): string => (props.indeterminate === true ? "" : `${Math.round(percent())}%`)}
                        </span>
                    ) : null}
                </div>
            ) : null}
            <div
                class="kyn-progress__track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={max}
                aria-valuenow={props.indeterminate === true ? undefined : (): number => Math.round(current())}
                aria-label={props.label ?? "Progress"}
            >
                <div
                    class="kyn-progress__bar"
                    style={(): string => (props.indeterminate === true ? "" : `width: ${percent()}%`)}
                />
            </div>
        </div>
    );
}
