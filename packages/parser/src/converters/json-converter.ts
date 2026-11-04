import type { IConverter } from "./i-converter.js";
import { isRecord } from "./record-converter.js";

/**
 * Parses and serialises JSON text.
 *
 * Parsing never throws: malformed text produces `undefined`. Serialisation
 * also returns `undefined` for values that cannot be represented as JSON,
 * such as circular objects.
 *
 * @example
 * ```ts
 * const converter = new JsonConverter();
 * converter.parseText('{"ok":true}'); // { ok: true }
 * converter.stringify({ ok: true }); // '{"ok":true}'
 * ```
 */
export class JsonConverter implements IConverter {
    /**
     * Parses JSON text coming from a string input.
     *
     * @param input Text to parse.
     * @returns The parsed value, or `undefined` when the input is not text or
     * the JSON is malformed.
     * @example
     * ```ts
     * new JsonConverter().convert('{"ok":true}'); // { ok: true }
     * ```
     */
    public convert(input: unknown): unknown {
        if (typeof input !== "string") {
            return undefined;
        }

        const parsed = this.parseText(input);
        return isRecord(parsed) ? parsed : undefined;
    }

    /**
     * Parses JSON text.
     *
     * @param text JSON document.
     * @returns The parsed value, or `undefined` when parsing fails.
     * @example
     * ```ts
     * new JsonConverter().parseText("[1,2]"); // [1, 2]
     * ```
     */
    public parseText(text: string): unknown {
        try {
            return JSON.parse(text);
        } catch {
            return undefined;
        }
    }

    /**
     * Serialises a value as JSON.
     *
     * @param value Value to serialise.
     * @returns The JSON text, or `undefined` when serialisation fails.
     * @example
     * ```ts
     * new JsonConverter().stringify({ ok: true }); // '{"ok":true}'
     * ```
     */
    public stringify(value: unknown): string | undefined {
        try {
            return JSON.stringify(value);
        } catch {
            return undefined;
        }
    }
}
