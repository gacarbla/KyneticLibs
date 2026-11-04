import type { Child } from "@kyneticweb/dom";
import { cx } from "./classes.js";

/** Props accepted by {@link Spinner}. */
export interface SpinnerProps {
    /** Accessible label. Defaults to "Loading". */
    readonly label?: string;
    readonly size?: "sm" | "md";
    readonly class?: string;
}

/**
 * Animated status indicator.
 *
 * @example
 * ```tsx
 * <Spinner label="Saving" />
 * ```
 */
export function Spinner(props: SpinnerProps): Child {
    return (
        <span
            class={cx("kyn-spinner", `kyn-spinner--${props.size ?? "md"}`, props.class)}
            role="status"
            aria-label={props.label ?? "Loading"}
        />
    );
}
