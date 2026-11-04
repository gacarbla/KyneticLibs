import type { IConverter } from "./i-converter.js";
import { JsonConverter } from "./json-converter.js";

/**
 * Serialises values as JSON text.
 *
 * @example
 * ```ts
 * const converter = new JsonStringConverter();
 * converter.convert({ ok: true }); // '{"ok":true}'
 * ```
 */
export class JsonStringConverter implements IConverter {
    private readonly json = new JsonConverter();

    /**
     * @param input Value to serialise.
     * @returns The JSON text, or `undefined` when serialisation fails.
     * @example
     * ```ts
     * new JsonStringConverter().convert([1, 2]); // "[1,2]"
     * ```
     */
    public convert(input: unknown): string | undefined {
        return this.json.stringify(input);
    }
}
