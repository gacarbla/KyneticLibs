import type { IConverter } from "./i-converter.js";
import { YamlConverter } from "./yaml-converter.js";

/**
 * Serialises values as YAML text.
 *
 * @example
 * ```ts
 * const converter = new YamlStringConverter();
 * converter.convert({ ok: true }); // "ok: true\n"
 * ```
 */
export class YamlStringConverter implements IConverter {
    private readonly yaml = new YamlConverter();

    /**
     * @param input Value to serialise.
     * @returns The YAML text, or `undefined` when serialisation fails.
     * @example
     * ```ts
     * new YamlStringConverter().convert([1, 2]); // "- 1\n- 2\n"
     * ```
     */
    public convert(input: unknown): string | undefined {
        return this.yaml.stringify(input);
    }
}
