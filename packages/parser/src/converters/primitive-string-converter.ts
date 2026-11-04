import type { IConverter } from "./i-converter.js";

/**
 * Converts primitive values into their string representation.
 *
 * @example
 * ```ts
 * const converter = new PrimitiveStringConverter();
 * converter.convert(12); // "12"
 * converter.convert(false); // "false"
 * ```
 */
export class PrimitiveStringConverter implements IConverter {
    /**
     * @param input String, number or boolean.
     * @returns The string representation, or `undefined` for other inputs.
     * @example
     * ```ts
     * new PrimitiveStringConverter().convert(true); // "true"
     * ```
     */
    public convert(input: unknown): string | undefined {
        if (typeof input === "string" || typeof input === "number" || typeof input === "boolean") {
            return String(input);
        }

        return undefined;
    }
}
