import type { IConverter } from "./i-converter.js";
import { DateConverter } from "./date-converter.js";

/**
 * Converts dates and date-like values into ISO 8601 strings.
 *
 * @example
 * ```ts
 * const converter = new DateStringConverter();
 * converter.convert(new Date("2026-11-04T00:00:00Z"));
 * // "2026-11-04T00:00:00.000Z"
 * ```
 */
export class DateStringConverter implements IConverter {
    private readonly dates = new DateConverter();

    /**
     * @param input Date, date string or timestamp.
     * @returns The ISO string, or `undefined` when the date is invalid.
     * @example
     * ```ts
     * new DateStringConverter().convert(new Date(0)); // "1970-01-01T00:00:00.000Z"
     * ```
     */
    public convert(input: unknown): string | undefined {
        const date = this.dates.convert(input);

        return date === undefined ? undefined : date.toISOString();
    }
}
