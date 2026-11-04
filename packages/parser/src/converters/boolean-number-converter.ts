import type { IConverter } from "./i-converter.js";

/**
 * Converts booleans into the numbers `1` and `0`.
 *
 * @example
 * ```ts
 * const converter = new BooleanNumberConverter();
 * converter.convert(true); // 1
 * converter.convert(false); // 0
 * ```
 */
export class BooleanNumberConverter implements IConverter {
    /**
     * @param input Boolean value.
     * @returns `1` for `true`, `0` for `false`, otherwise `undefined`.
     * @example
     * ```ts
     * new BooleanNumberConverter().convert(false); // 0
     * ```
     */
    public convert(input: unknown): number | undefined {
        if (typeof input !== "boolean") {
            return undefined;
        }

        return input ? 1 : 0;
    }
}
