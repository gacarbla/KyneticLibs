import type { IConverter } from "./i-converter.js";

/**
 * Converter that returns its input untouched.
 *
 * It is used for same-format conversions, such as `string -> string` or
 * `object -> object`.
 *
 * @example
 * ```ts
 * new IdentityConverter().convert("hello"); // "hello"
 * ```
 */
export class IdentityConverter implements IConverter {
    /**
     * @param input Value returned as-is.
     * @returns The same value that was received.
     * @example
     * ```ts
     * new IdentityConverter().convert(42); // 42
     * ```
     */
    public convert(input: unknown): unknown {
        return input;
    }
}
