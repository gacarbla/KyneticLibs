/**
 * Public types for `@kyneticweb/parser`.
 *
 * The parser is built around two axis: the format of the input and the format
 * of the output. Those pairings are encoded in the following conditional
 * types, so the compiler only allows conversions that make sense.
 */

/**
 * Every input format accepted by the parser.
 *
 * @example
 * ```ts
 * const format: InputFormat = "stringDate";
 * ```
 */
export type InputFormat =
    "string" | "number" | "boolean" | "date" | "object" | "json" | "yaml" | "stringDate" | "datePattern";

/**
 * Every format that an object-like value can be rendered to.
 *
 * @example
 * ```ts
 * const format: ObjectOutputFormat = "yaml";
 * ```
 */
export type ObjectOutputFormat = "object" | "yaml" | "string";

/**
 * Output formats allowed for a given input format.
 *
 * @example
 * ```ts
 * const format: OutputFormat<"string"> = "number";
 * ```
 */
export type OutputFormat<F extends InputFormat> = F extends "string"
    ? "number" | "boolean" | "date" | ObjectOutputFormat
    : F extends "number"
      ? "number" | "string" | "boolean"
      : F extends "boolean"
        ? "boolean" | "string" | "number"
        : F extends "date"
          ? "date" | "string" | "number"
          : F extends "stringDate"
            ? "date" | "string" | "number"
            : F extends "datePattern"
              ? "function"
              : F extends "object"
                ? ObjectOutputFormat
                : F extends "json"
                  ? ObjectOutputFormat
                  : F extends "yaml"
                    ? ObjectOutputFormat
                    : never;

/**
 * Type of the value accepted by the parser for a given input format.
 *
 * @example
 * ```ts
 * const input: InputType<"date"> = new Date();
 * ```
 */
export type InputType<F extends InputFormat> = F extends "string" | "stringDate" | "datePattern"
    ? string
    : F extends "number"
      ? number
      : F extends "boolean"
        ? boolean
        : F extends "date"
          ? Date
          : F extends "object"
            ? Record<string, unknown>
            : F extends "json" | "yaml"
              ? string | URL
              : never;

/**
 * Type of the value produced by the parser for a given pair of formats.
 *
 * `yaml` is the only output whose type depends on the input: converting a
 * structured value or a file produces YAML text, while reading YAML text
 * produces an object.
 *
 * @example
 * ```ts
 * const value: OutputType<"date", "date"> = new Date();
 * ```
 */
export type OutputType<F extends InputFormat, O extends OutputFormat<F>> = O extends "string"
    ? string
    : O extends "number"
      ? number
      : O extends "boolean"
        ? boolean
        : O extends "date"
          ? Date
          : O extends "object"
            ? Record<string, unknown>
            : O extends "yaml"
              ? F extends "object" | "json" | "yaml"
                  ? string
                  : Record<string, unknown>
              : O extends "function"
                ? (date: Date) => string
                : never;

/**
 * A known locale code. The `(string & {})` branch keeps autocompletion for
 * the common codes while still accepting custom ones.
 *
 * @example
 * ```ts
 * const code: LocaleCode = "gl-ES";
 * ```
 */
export type LocaleCode = "es-ES" | "en-US" | "gl-ES" | (string & {});

/**
 * Data needed to translate a language into numbers.
 *
 * @example
 * ```ts
 * const definition: LocaleDefinition = {
 *     units: { uno: 1, dos: 2 },
 *     tens: {},
 *     hundreds: {},
 *     scales: { mil: 1000 },
 *     connectors: ["y"],
 * };
 * ```
 */
export interface LocaleDefinition {
    /** Words that represent a single value, such as `"uno"` or `"seventeen"`. */
    readonly units: Readonly<Record<string, number>>;
    /** Words that represent a ten, such as `"treinta"` or `"twenty"`. */
    readonly tens: Readonly<Record<string, number>>;
    /** Words that represent a hundred, such as `"doscientos"` or `"hundred"`. */
    readonly hundreds: Readonly<Record<string, number>>;
    /** Words that multiply the previous group, such as `"mil"` or `"million"`. */
    readonly scales: Readonly<Record<string, number>>;
    /** Words ignored while reading, such as `"y"` or `"and"`. */
    readonly connectors: readonly string[];
}

/**
 * Successful or failed result returned by {@link Parser.tryParse}.
 *
 * @example
 * ```ts
 * const result: ParseResult<number> = { ok: true, value: 12 };
 * ```
 */
export type ParseResult<T> =
    { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: ParseError };

/**
 * Error thrown by {@link Parser.parseOrThrow} when a conversion fails.
 *
 * @example
 * ```ts
 * try {
 *     parser.parseOrThrow("string", "number", "abc");
 * } catch (error) {
 *     if (error instanceof ParseError) {
 *         console.error(error.from, error.to, error.input);
 *     }
 * }
 * ```
 */
export class ParseError extends Error {
    /**
     * @param message Human readable description of the failure.
     * @param from Input format used by the failed conversion.
     * @param to Output format requested by the failed conversion.
     * @param input Original value that could not be converted.
     * @example
     * ```ts
     * const error = new ParseError("Invalid number.", "string", "number", "abc");
     * ```
     */
    public constructor(
        message: string,
        public readonly from: InputFormat,
        public readonly to: string,
        public readonly input: unknown,
    ) {
        super(message);
        this.name = "ParseError";
    }
}
