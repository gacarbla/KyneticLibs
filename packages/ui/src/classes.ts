/** Joins class names, skipping falsy values. */
export function cx(...parts: Array<string | false | null | undefined>): string {
    return parts.filter((part): part is string => typeof part === "string" && part.length > 0).join(" ");
}

/** Reads a prop that may be a value or an accessor. */
export function read<T>(value: T | (() => T) | undefined): T | undefined {
    return typeof value === "function" ? (value as () => T)() : value;
}
