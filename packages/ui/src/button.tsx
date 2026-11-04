import type { Child } from "@kyneticweb/dom";
import { cx, read } from "./classes.js";

/** Visual variants of {@link Button}. */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

/** Sizes of {@link Button}. */
export type ButtonSize = "sm" | "md" | "lg";

/** Props accepted by {@link Button}. */
export interface ButtonProps {
    readonly variant?: ButtonVariant;
    readonly size?: ButtonSize;
    readonly type?: "button" | "submit" | "reset";
    /** Disabled state, or an accessor for reactive state. */
    readonly disabled?: boolean | (() => boolean);
    /** Shows a spinner and blocks interaction. */
    readonly loading?: boolean | (() => boolean);
    readonly onClick?: (event: MouseEvent) => void;
    readonly class?: string;
    readonly children?: Child;
}

/**
 * Accessible button with variants, sizes and a loading state.
 *
 * @example
 * ```tsx
 * <Button variant="primary" onClick={save}>Save</Button>
 * ```
 */
export function Button(props: ButtonProps): Child {
    const variant = props.variant ?? "secondary";
    const size = props.size ?? "md";
    const blocked = (): boolean => read(props.disabled) === true || read(props.loading) === true;

    return (
        <button
            type={props.type ?? "button"}
            class={cx("kyn-btn", `kyn-btn--${variant}`, `kyn-btn--${size}`, props.class)}
            disabled={blocked}
            aria-busy={(): string | undefined => (read(props.loading) === true ? "true" : undefined)}
            onClick={props.onClick}
        >
            {(): Child => (read(props.loading) === true ? <span class="kyn-btn__spinner" aria-hidden="true" /> : null)}
            {props.children}
        </button>
    );
}
