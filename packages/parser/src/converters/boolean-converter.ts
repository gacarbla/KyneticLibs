import type { IConverter } from "./i-converter.js";

const TRUE_WORDS: ReadonlySet<string> = new Set(["true", "1", "yes", "y", "on"]);
const FALSE_WORDS: ReadonlySet<string> = new Set(["false", "0", "no", "n", "off"]);

/**
 * Converts booleans, numbers and common boolean words into a boolean.
 *
 * Strings are trimmed and lowercased before being looked up. Anything that is
 * not a recognised boolean representation produces `undefined`.
 *
 * @example
 * ```ts
 * const converter = new BooleanConverter();
 * converter.convert("TRUE"); // true
 * converter.convert("maybe"); // undefined
 * ```
 */
export class BooleanConverter implements IConverter {
    /**
     * @param input Boolean, number or boolean word.
     * @returns The converted boolean, or `undefined` when it is not recognised.
     * @example
     * ```ts
     * new BooleanConverter().convert("yes"); // true
     * ```
     */
    public convert(input: unknown): boolean | undefined {
        if (typeof input === "boolean") {
            return input;
        }

        if (typeof input === "number") {
            return Boolean(input);
        }

        if (typeof input === "string") {
            return this.convertWord(input);
        }

        return undefined;
    }

    /** Looks up a trimmed, lowercase word in the true/false dictionaries. */
    private convertWord(input: string): boolean | undefined {
        const word = input.trim().toLowerCase();

        if (TRUE_WORDS.has(word)) {
            return true;
        }

        if (FALSE_WORDS.has(word)) {
            return false;
        }

        return undefined;
    }
}
