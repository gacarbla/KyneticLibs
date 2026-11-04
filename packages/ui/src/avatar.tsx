import type { Child } from "@kyneticweb/dom";
import { cx, sizeToken, type SizeInput } from "./classes.js";

/** Avatar size, including the extra-small token. */
export type AvatarSize = SizeInput | "xs";

/** Presence indicator. */
export type AvatarStatus = "online" | "offline" | "busy" | "away";

/** Props accepted by {@link Avatar}. */
export interface AvatarProps {
    readonly name?: string;
    readonly src?: string;
    readonly alt?: string;
    readonly size?: AvatarSize;
    readonly shape?: "circle" | "square";
    readonly status?: AvatarStatus;
    readonly class?: string;
}

/** Builds initials from a name. */
function initials(name: string | undefined): string {
    if (name === undefined) {
        return "?";
    }
    const parts = name
        .trim()
        .split(/\s+/)
        .filter((part) => part.length > 0);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
    return `${first}${last}`.toUpperCase() || "?";
}

/**
 * Avatar with image or initials and an optional presence dot.
 *
 * @example
 * ```tsx
 * <Avatar name="Ana Pérez" size="medium" status="online" />
 * ```
 */
export function Avatar(props: AvatarProps): Child {
    const token = props.size === "xs" ? "xs" : sizeToken(props.size);

    return (
        <span
            class={cx("kyn-avatar", `kyn-avatar--${token}`, props.shape === "square" && "is-square", props.class)}
            role="img"
            aria-label={props.alt ?? props.name ?? "Avatar"}
        >
            {props.src !== undefined ? (
                <img class="kyn-avatar__image" src={props.src} alt="" />
            ) : (
                <span class="kyn-avatar__initials" aria-hidden="true">
                    {initials(props.name)}
                </span>
            )}
            {props.status !== undefined ? (
                <span class={cx("kyn-avatar__status", `is-${props.status}`)} aria-hidden="true" />
            ) : null}
        </span>
    );
}
