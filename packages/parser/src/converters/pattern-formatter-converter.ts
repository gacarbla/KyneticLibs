import { DateFormatter } from "@kyneticweb/utils";
import type { IConverter } from "./i-converter.js";

/**
 * Builds date formatting functions from a pattern.
 *
 * The returned function uses {@link DateFormatter} from `@kyneticweb/utils`,
 * so it supports the same tokens (`YYYY`, `MM`, `DD`, `HH`, `mm`, `ss`, …).
 *
 * @example
 * ```ts
 * const converter = new PatternFormatterConverter();
 * const format = converter.convert("YYYY-MM-DD");
 * if (format) {
 *     format(new Date(2026, 10, 4)); // "2026-11-04"
 * }
 * ```
 */
export class PatternFormatterConverter implements IConverter {
    /**
     * @param input Date pattern, for example `"YYYY-MM-DD"`.
     * @returns A formatter function, or `undefined` when the pattern is not a
     * non-empty string or cannot be compiled.
     * @example
     * ```ts
     * const format = new PatternFormatterConverter().convert("YYYY");
     * ```
     */
    public convert(input: unknown): ((date: Date) => string) | undefined {
        if (typeof input !== "string" || input.length === 0) {
            return undefined;
        }

        try {
            const formatter = new DateFormatter(input);
            return (date: Date): string => formatter.format(date);
        } catch {
            return undefined;
        }
    }
}
