/**
 * Contract implemented by every value converter.
 *
 * The converter registry stores converters under a `"from->to"` key, so a
 * converter only has to know how to turn an unknown input into the value of
 * its target format.
 */
export interface IConverter {
    /**
     * Converts a value into the format owned by the converter.
     *
     * @param input Value to convert.
     * @returns The converted value, or `undefined` when the input is invalid.
     * @example
     * ```ts
     * const converter: IConverter = new NumberConverter();
     * converter.convert("12"); // 12
     * ```
     */
    convert(input: unknown): unknown;
}
