import type { IConverter } from "./i-converter.js";

/**
 * Converts date instances, date strings and timestamps into a valid `Date`.
 *
 * Invalid dates produce `undefined` instead of the infamous `Invalid Date`
 * instance.
 *
 * @example
 * ```ts
 * const converter = new DateConverter();
 * converter.convert("2026-11-04T00:00:00Z"); // Date
 * converter.convert("not-a-date"); // undefined
 * ```
 */
export class DateConverter implements IConverter {
    /**
     * @param input Date, date string or timestamp.
     * @returns A valid `Date`, or `undefined` when it cannot be parsed.
     * @example
     * ```ts
     * new DateConverter().convert("2026-11-04"); // Date
     * ```
     */
    public convert(input: unknown): Date | undefined {
        if (input instanceof Date) {
            return this.isValid(input) ? input : undefined;
        }

        if (typeof input === "number") {
            return this.fromNumber(input);
        }

        if (typeof input === "string") {
            return this.fromText(input);
        }

        return undefined;
    }

    /** Builds a date from a timestamp. */
    private fromNumber(input: number): Date | undefined {
        if (!Number.isFinite(input)) {
            return undefined;
        }

        const date = new Date(input);
        return this.isValid(date) ? date : undefined;
    }

    /** Builds a date from trimmed text. */
    private fromText(input: string): Date | undefined {
        const text = input.trim();

        if (text.length === 0) {
            return undefined;
        }

        const date = new Date(text);
        return this.isValid(date) ? date : undefined;
    }

    /** Returns `true` when the date holds a real point in time. */
    private isValid(date: Date): boolean {
        return !Number.isNaN(date.getTime());
    }
}
