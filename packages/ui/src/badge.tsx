import type { Child } from "@kyneticweb/dom";
import { cx } from "./classes.js";

/** Tones available to {@link Badge}. */
export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

/** Props accepted by {@link Badge}. */
export interface BadgeProps {
    readonly tone?: BadgeTone;
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
    return <span class={cx("kyn-badge", `kyn-badge--${props.tone ?? "neutral"}`, props.class)}>{props.children}</span>;
}
