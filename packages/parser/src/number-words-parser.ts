import { LocaleRegistry } from "./locale-registry.js";
import type { LocaleDefinition } from "./types.js";

/** Removes accents and lowercases text before tokenising it. */
function normalizeText(text: string): string {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

/** Reads a numeric word without touching inherited object properties. */
function readNumber(record: Readonly<Record<string, number>>, key: string): number | undefined {
    return Object.hasOwn(record, key) ? record[key] : undefined;
}

/** Returns the first defined value from a list of optional numbers. */
function firstDefined(...values: ReadonlyArray<number | undefined>): number | undefined {
    return values.find((value) => value !== undefined);
}

/**
 * Reads numbers written as words.
 *
 * The parser normalises accents, ignores connectors such as `"y"` or `"and"`,
 * adds units, tens and hundreds, and multiplies by scale words such as
 * `"mil"` or `"million"`. Composite words like `"tresmil"` are split into
 * `"tres"` and `"mil"` automatically.
 *
 * Nested scales are not composed (`"mil millones"`); register the combination
 * as a single scale word in the locale when it is needed.
 *
 * @example
 * ```ts
 * const parser = new NumberWordsParser();
 * parser.parse("treinta y uno"); // 31
 * parser.parse("one thousand two hundred", "en-US"); // 1200
 * ```
 */
export class NumberWordsParser {
    private readonly locales: LocaleRegistry;

    /**
     * @param locales Registry that supplies the locale definitions. It
     * defaults to a registry with the bundled locales.
     * @example
     * ```ts
     * const parser = new NumberWordsParser(new LocaleRegistry());
     * ```
     */
    public constructor(locales: LocaleRegistry = new LocaleRegistry()) {
        this.locales = locales;
    }

    /**
     * Converts text into a number.
     *
     * @param text Number written as words.
     * @param locale Locale code used to interpret the words. Defaults to
     * `"es-ES"`.
     * @returns The numeric value, or `0` when no numeric word is present.
     * @throws {Error} When the locale is not registered.
     * @example
     * ```ts
     * parser.parse("mil doscientos"); // 1200
     * parser.parse("nada que ver"); // 0
     * ```
     */
    public parse(text: string, locale = "es-ES"): number {
        const definition = this.locales.get(locale);
        let total = 0;
        let current = 0;

        for (const token of this.tokenize(text, definition)) {
            if (definition.connectors.includes(token)) {
                continue;
            }

            const scale = readNumber(definition.scales, token);

            if (scale !== undefined) {
                total += (current === 0 ? 1 : current) * scale;
                current = 0;
                continue;
            }

            const hundred = readNumber(definition.hundreds, token);

            if (hundred !== undefined) {
                // A bare "hundred"/"ciento" (100) multiplies the pending group,
                // so "two hundred" becomes 200. Compound words such as
                // "doscientos" (200) already carry their value and are added.
                current = hundred === 100 ? (current === 0 ? 1 : current) * hundred : current + hundred;
                continue;
            }

            const additive = this.readUnitOrTen(token, definition);
            current += additive ?? 0;
        }

        return total + current;
    }

    /** Reads a unit or a ten, in that order. */
    private readUnitOrTen(token: string, definition: LocaleDefinition): number | undefined {
        return firstDefined(readNumber(definition.units, token), readNumber(definition.tens, token));
    }

    /** Normalises, splits and expands the words of a text. */
    private tokenize(text: string, definition: LocaleDefinition): string[] {
        const scaleKeys = Object.keys(definition.scales).sort((left, right) => right.length - left.length);

        return normalizeText(text)
            .split(/[\s-]+/u)
            .filter((token) => token.length > 0)
            .flatMap((token) => this.expandScaleToken(token, definition, scaleKeys));
    }

    /** Splits a composite token such as `"tresmil"` into `["tres", "mil"]`. */
    private expandScaleToken(token: string, definition: LocaleDefinition, scaleKeys: readonly string[]): string[] {
        const scale = scaleKeys.find((key) => token.length > key.length && token.endsWith(key));

        if (scale === undefined) {
            return [token];
        }

        const prefix = token.slice(0, -scale.length);

        if (!this.isNumberWord(prefix, definition)) {
            return [token];
        }

        return [...this.expandScaleToken(prefix, definition, scaleKeys), scale];
    }

    /** Checks whether a word belongs to any numeric dictionary. */
    private isNumberWord(token: string, definition: LocaleDefinition): boolean {
        return (
            readNumber(definition.units, token) !== undefined ||
            readNumber(definition.tens, token) !== undefined ||
            readNumber(definition.hundreds, token) !== undefined ||
            readNumber(definition.scales, token) !== undefined
        );
    }
}
