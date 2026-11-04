/** Canonical size names. */
export type Size = "small" | "medium" | "large";

/** Size accepted by components; short aliases are also valid. */
export type SizeInput = Size | "sm" | "md" | "lg";

/** Normalizes a size to the CSS token (`sm`, `md` or `lg`). */
export function sizeToken(size?: SizeInput): "sm" | "md" | "lg" {
    if (size === "small" || size === "sm") {
        return "sm";
    }
    if (size === "large" || size === "lg") {
        return "lg";
    }
    return "md";
}

/** Joins class names, skipping falsy values. */
export function cx(...parts: Array<string | false | null | undefined>): string {
    return parts.filter((part): part is string => typeof part === "string" && part.length > 0).join(" ");
}

/** Reads a prop that may be a value or an accessor. */
export function read<T>(value: T | (() => T) | undefined): T | undefined {
    return typeof value === "function" ? (value as () => T)() : value;
}
