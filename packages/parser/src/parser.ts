import type { ConversionKey, ConverterRegistry } from "./converter-registry.js";
import { createDefaultConverterRegistry } from "./default-converters.js";
import { LocaleRegistry } from "./locale-registry.js";
import { NumberWordsParser } from "./number-words-parser.js";
import { ParseError } from "./types.js";
import type { InputFormat, InputType, LocaleDefinition, OutputFormat, OutputType, ParseResult } from "./types.js";

/**
 * Type-safe facade for every conversion offered by the package.
 *
 * The parser never throws for invalid input: {@link Parser.parse} returns
 * `undefined`, {@link Parser.parseOrThrow} throws a {@link ParseError}, and
 * {@link Parser.tryParse} returns a discriminated result.
 *
 * @example
 * ```ts
 * const parser = new Parser();
 * parser.parse("string", "number", "12"); // 12
 * parser.parse("string", "number", "abc"); // undefined
 * parser.textToNumber("veintiuno"); // 21
 * ```
 */
export class Parser {
    /** Identifier used by `@kyneticweb/core` to expose the tool. */
    public readonly toolKind = "parser";

    private readonly localeRegistry: LocaleRegistry;
    private readonly converterRegistry: ConverterRegistry;
    private readonly numberWords: NumberWordsParser;

    /**
     * @param locales Locale registry used by {@link Parser.textToNumber}.
     * Defaults to a registry with the bundled locales.
     * @param converters Converter registry used by {@link Parser.parse}.
     * Defaults to a registry with every bundled conversion.
     * @example
     * ```ts
     * const parser = new Parser();
     * ```
     */
    public constructor(
        locales: LocaleRegistry = new LocaleRegistry(),
        converters: ConverterRegistry = createDefaultConverterRegistry(),
    ) {
        this.localeRegistry = locales;
        this.converterRegistry = converters;
        this.numberWords = new NumberWordsParser(locales);
    }

    /**
     * Locale registry used to read numbers written as words.
     *
     * @example
     * ```ts
     * parser.locales.codes(); // ["es-ES", "en-US", "gl-ES"]
     * ```
     */
    public get locales(): LocaleRegistry {
        return this.localeRegistry;
    }

    /**
     * Registry of available conversions.
     *
     * @example
     * ```ts
     * parser.converters.resolve("string->number");
     * ```
     */
    public get converters(): ConverterRegistry {
        return this.converterRegistry;
    }

    /**
     * Registers a locale for {@link Parser.textToNumber}.
     *
     * @param code Locale code, for example `"fr-FR"`.
     * @param definition Words and connectors used by that locale.
     * @returns This parser, to allow chaining.
     * @example
     * ```ts
     * parser.registerLocale("xx-XX", definition);
     * ```
     */
    public registerLocale(code: string, definition: LocaleDefinition): this {
        this.localeRegistry.register(code, definition);
        return this;
    }

    /**
     * Converts a value without throwing.
     *
     * @param from Input format.
     * @param to Output format.
     * @param input Value to convert.
     * @returns The converted value, or `undefined` when the input is invalid or
     * the conversion is not available.
     * @example
     * ```ts
     * parser.parse("string", "boolean", "yes"); // true
     * parser.parse("string", "number", "abc"); // undefined
     * ```
     */
    public parse<F extends InputFormat, O extends OutputFormat<F>>(
        from: F,
        to: O,
        input: InputType<F>,
    ): OutputType<F, O> | undefined {
        try {
            const converter = this.converterRegistry.resolve(this.conversionKey(from, to));
            const converted = converter.convert(input);

            // SAFETY: the registry maps each `from`/`to` pair to the converter
            // that produces exactly `OutputType<O>` at runtime. TypeScript
            // cannot express that link through an untyped `IConverter`, so this
            // is the single documented assertion at the public facade boundary.
            return converted as OutputType<F, O> | undefined;
        } catch {
            return undefined;
        }
    }

    /**
     * Converts a value, throwing when the conversion fails.
     *
     * @param from Input format.
     * @param to Output format.
     * @param input Value to convert.
     * @returns The converted value.
     * @throws {ParseError} When {@link Parser.parse} would return `undefined`.
     * @example
     * ```ts
     * try {
     *     parser.parseOrThrow("string", "number", "abc");
     * } catch (error) {
     *     // error is a ParseError
     * }
     * ```
     */
    public parseOrThrow<F extends InputFormat, O extends OutputFormat<F>>(
        from: F,
        to: O,
        input: InputType<F>,
    ): OutputType<F, O> {
        const value = this.parse(from, to, input);

        if (value === undefined) {
            throw new ParseError(`Cannot convert input from "${from}" to "${to}".`, from, to, input);
        }

        return value;
    }

    /**
     * Converts a value and wraps the outcome in a result object.
     *
     * @param from Input format.
     * @param to Output format.
     * @param input Value to convert.
     * @returns `{ ok: true, value }` on success, or `{ ok: false, error }`.
     * @example
     * ```ts
     * parser.tryParse("string", "number", "12"); // { ok: true, value: 12 }
     * parser.tryParse("string", "number", "abc"); // { ok: false, error }
     * ```
     */
    public tryParse<F extends InputFormat, O extends OutputFormat<F>>(
        from: F,
        to: O,
        input: InputType<F>,
    ): ParseResult<OutputType<F, O>> {
        const value = this.parse(from, to, input);

        if (value === undefined) {
            const error = new ParseError(`Cannot convert input from "${from}" to "${to}".`, from, to, input);
            return { ok: false, error };
        }

        return { ok: true, value };
    }

    /**
     * Converts a number written as words.
     *
     * @param text Number written as words.
     * @param locale Locale code used to interpret the words. Defaults to
     * `"es-ES"`.
     * @returns The numeric value, or `0` when no numeric word is present.
     * @throws {Error} When the locale is not registered.
     * @example
     * ```ts
     * parser.textToNumber("un millon"); // 1_000_000
     * parser.textToNumber("one thousand two hundred", "en-US"); // 1200
     * ```
     */
    public textToNumber(text: string, locale = "es-ES"): number {
        return this.numberWords.parse(text, locale);
    }

    /** Builds a conversion key from typed formats. */
    private conversionKey(from: InputFormat, to: string): ConversionKey {
        return `${from}->${to}`;
    }
}
