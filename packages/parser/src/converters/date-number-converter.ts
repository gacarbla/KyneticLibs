import type { IConverter } from "./i-converter.js";
import { DateConverter } from "./date-converter.js";

/**
 * Converts dates and date-like values into millisecond timestamps.
 *
 * @example
 * ```ts
 * const converter = new DateNumberConverter();
 * converter.convert(new Date(0)); // 0
 * ```
 */
export class DateNumberConverter implements IConverter {
    private readonly dates = new DateConverter();

    /**
     * @param input Date, date string or timestamp.
     * @returns The timestamp, or `undefined` when the date is invalid.
     * @example
     * ```ts
     * new DateNumberConverter().convert("1970-01-01T00:00:00Z"); // 0
     * ```
     */
    public convert(input: unknown): number | undefined {
        const date = this.dates.convert(input);

        return date === undefined ? undefined : date.getTime();
    }
}
