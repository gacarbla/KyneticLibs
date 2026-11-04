import type { IConverter } from "./i-converter.js";

/**
 * Converts numbers, booleans and numeric strings into a finite number.
 *
 * A single comma is accepted as decimal separator when the text does not
 * contain a dot, so `"12,5"` becomes `12.5`. Empty strings and values that are
 * not finite produce `undefined`.
 *
 * @example
 * ```ts
 * const converter = new NumberConverter();
 * converter.convert("12,5"); // 12.5
 * converter.convert("abc"); // undefined
 * ```
 */
export class NumberConverter implements IConverter {
    /**
     * @param input Number, boolean or numeric string.
     * @returns The converted finite number, or `undefined` when invalid.
     * @example
     * ```ts
     * new NumberConverter().convert("42"); // 42
     * ```
     */
    public convert(input: unknown): number | undefined {
        if (typeof input === "number") {
            return Number.isFinite(input) ? input : undefined;
        }

        if (typeof input === "boolean") {
            return input ? 1 : 0;
        }

        if (typeof input === "string") {
            return this.convertText(input);
        }

        return undefined;
    }

    /** Parses numeric text, normalising a single decimal comma. */
    private convertText(input: string): number | undefined {
        const text = input.trim();

        if (text.length === 0) {
            return undefined;
        }

        const normalized = text.includes(".") ? text : text.replace(",", ".");
        const value = Number(normalized);

        return Number.isFinite(value) ? value : undefined;
    }
}
