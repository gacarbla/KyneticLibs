import type { Child } from "@kyneticweb/dom";
import { cx, sizeToken, type SizeInput } from "./classes.js";

/** Tones available to {@link Badge}. */
export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

/** Props accepted by {@link Badge}. */
export interface BadgeProps {
    readonly tone?: BadgeTone;
    readonly size?: SizeInput;
    /** Shows a leading dot. */
    readonly dot?: boolean;
    readonly class?: string;
    readonly children?: Child;
}

/**
 * Small status label.
 *
 * @example
 * ```tsx
 * <Badge tone="success">Saved</Badge>
 * ```
 */
export function Badge(props: BadgeProps): Child {
    return (
        <span
            class={cx(
                "kyn-badge",
                `kyn-badge--${props.tone ?? "neutral"}`,
                `kyn-badge--${sizeToken(props.size)}`,
                props.class,
            )}
        >
            {props.dot === true ? <span class="kyn-badge__dot" aria-hidden="true" /> : null}
            {props.children}
        </span>
    );
}
