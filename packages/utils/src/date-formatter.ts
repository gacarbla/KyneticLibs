/**
 * Formatting of dates using a small, predictable token language.
 *
 * Supported tokens:
 *
 * | Token  | Meaning                    | Example |
 * | ------ | -------------------------- | ------- |
 * | `YYYY` | Four digit year            | 2026    |
 * | `YY`   | Two digit year             | 26      |
 * | `MM`   | Month, padded              | 03      |
 * | `M`    | Month, not padded          | 3       |
 * | `DD`   | Day of month, padded       | 07      |
 * | `D`    | Day of month, not padded   | 7       |
 * | `HH`   | Hours (24h), padded        | 09      |
 * | `H`    | Hours (24h), not padded    | 9       |
 * | `mm`   | Minutes, padded            | 05      |
 * | `m`    | Minutes, not padded        | 5       |
 * | `ss`   | Seconds, padded            | 02      |
 * | `s`    | Seconds, not padded        | 2       |
 *
 * Text wrapped in square brackets is copied verbatim, which allows literal
 * characters that would otherwise be interpreted as tokens:
 *
 * ```ts
 * formatDate(new Date(), "[Day] D"); // "Day 7"
 * ```
 */

/** Every token understood by {@link DateFormatter}. */
export type DateToken = "YYYY" | "YY" | "MM" | "M" | "DD" | "D" | "HH" | "H" | "mm" | "m" | "ss" | "s";

/**
 * Tokens ordered from longest to shortest so the tokenizer always prefers the
 * most specific match (`YYYY` before `YY`).
 */
const TOKENS_BY_LENGTH: readonly DateToken[] = ["YYYY", "YY", "MM", "DD", "HH", "mm", "ss", "M", "D", "H", "m", "s"];

/** A piece of a compiled pattern: either literal text or a date token. */
type PatternPart =
    { readonly kind: "literal"; readonly text: string } | { readonly kind: "token"; readonly token: DateToken };

/**
 * Formats `Date` instances with a compiled pattern.
 *
 * The pattern is compiled once in the constructor, so formatting many dates
 * with the same pattern is cheap.
 *
 * @example
 * ```ts
 * const formatter = new DateFormatter("DD-MM-YYYY HH:mm:ss");
 * formatter.format(new Date()); // "04-11-2026 17:32:10"
 * ```
 */
export class DateFormatter {
    private readonly parts: readonly PatternPart[];

    /**
     * @param pattern Token pattern, for example `"YYYY-MM-DD"`.
     * @throws {RangeError} When the pattern is empty.
     */
    public constructor(public readonly pattern: string) {
        if (pattern.length === 0) {
            throw new RangeError("The date pattern must not be empty.");
        }
        this.parts = compilePattern(pattern);
    }

    /**
     * Formats a date.
     *
     * @param date Date to format.
     * @returns The formatted string.
     * @throws {RangeError} When `date` is not a valid date.
     */
    public format(date: Date): string {
        if (Number.isNaN(date.getTime())) {
            throw new RangeError("Cannot format an invalid date.");
        }
        return this.parts.map((part) => this.render(part, date)).join("");
    }

    /** Renders a single part of the compiled pattern. */
    private render(part: PatternPart, date: Date): string {
        if (part.kind === "literal") {
            return part.text;
        }
        return renderToken(part.token, date);
    }
}

/**
 * Formats a single date without keeping a formatter instance.
 *
 * Prefer {@link DateFormatter} when the same pattern is reused.
 *
 * @example
 * ```ts
 * formatDate(new Date(), "YYYY-MM-DD"); // "2026-11-04"
 * ```
 */
export function formatDate(date: Date, pattern: string): string {
    return new DateFormatter(pattern).format(date);
}

/** Splits a pattern into literal and token parts. */
function compilePattern(pattern: string): PatternPart[] {
    const parts: PatternPart[] = [];
    let index = 0;

    while (index < pattern.length) {
        if (pattern[index] === "[") {
            const closingIndex = pattern.indexOf("]", index + 1);
            if (closingIndex !== -1) {
                parts.push({ kind: "literal", text: pattern.slice(index + 1, closingIndex) });
                index = closingIndex + 1;
                continue;
            }
        }

        const token = matchTokenAt(pattern, index);
        if (token) {
            parts.push({ kind: "token", token });
            index += token.length;
            continue;
        }

        parts.push({ kind: "literal", text: pattern[index] });
        index += 1;
    }

    return parts;
}

/** Returns the longest token starting at `index`, if any. */
function matchTokenAt(pattern: string, index: number): DateToken | undefined {
    return TOKENS_BY_LENGTH.find((token) => pattern.startsWith(token, index));
}

/** Converts a token into its text representation for `date`. */
function renderToken(token: DateToken, date: Date): string {
    switch (token) {
        case "YYYY":
            return pad(date.getFullYear(), 4);
        case "YY":
            return pad(date.getFullYear() % 100, 2);
        case "MM":
            return pad(date.getMonth() + 1, 2);
        case "M":
            return String(date.getMonth() + 1);
        case "DD":
            return pad(date.getDate(), 2);
        case "D":
            return String(date.getDate());
        case "HH":
            return pad(date.getHours(), 2);
        case "H":
            return String(date.getHours());
        case "mm":
            return pad(date.getMinutes(), 2);
        case "m":
            return String(date.getMinutes());
        case "ss":
            return pad(date.getSeconds(), 2);
        case "s":
            return String(date.getSeconds());
    }
}

/** Pads a number with leading zeros up to `length` characters. */
function pad(value: number, length: number): string {
    return String(value).padStart(length, "0");
}
