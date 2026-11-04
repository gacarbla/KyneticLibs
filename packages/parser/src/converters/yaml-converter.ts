import yaml from "js-yaml";
import type { IConverter } from "./i-converter.js";
import { isRecord } from "./record-converter.js";

/**
 * Parses and serialises YAML documents using `js-yaml`.
 *
 * Parsing never throws: malformed text produces `undefined`.
 *
 * @example
 * ```ts
 * const converter = new YamlConverter();
 * converter.parse("name: kynetic"); // { name: "kynetic" }
 * converter.stringify({ name: "kynetic" }); // "name: kynetic\n"
 * ```
 */
export class YamlConverter implements IConverter {
    /**
     * Parses YAML text coming from a string input.
     *
     * @param input Text to parse.
     * @returns The parsed value, or `undefined` when the input is not text or
     * the YAML is malformed.
     * @example
     * ```ts
     * new YamlConverter().convert("ok: true"); // { ok: true }
     * ```
     */
    public convert(input: unknown): unknown {
        if (typeof input !== "string") {
            return undefined;
        }

        const parsed = this.parse(input);
        return isRecord(parsed) ? parsed : undefined;
    }

    /**
     * Parses a YAML document.
     *
     * @param text YAML document.
     * @returns The parsed value, or `undefined` when parsing fails.
     * @example
     * ```ts
     * new YamlConverter().parse("- one\n- two\n"); // ["one", "two"]
     * ```
     */
    public parse(text: string): unknown {
        try {
            return yaml.load(text);
        } catch {
            return undefined;
        }
    }

    /**
     * Serialises a value as YAML.
     *
     * @param value Value to serialise.
     * @returns The YAML text, or `undefined` when serialisation fails.
     * @example
     * ```ts
     * new YamlConverter().stringify({ ok: true }); // "ok: true\n"
     * ```
     */
    public stringify(value: unknown): string | undefined {
        try {
            return yaml.dump(value);
        } catch {
            return undefined;
        }
    }
}
