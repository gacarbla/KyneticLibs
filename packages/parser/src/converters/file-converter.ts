import { readFileSync } from "node:fs";
import type { IConverter } from "./i-converter.js";
import { IdentityConverter } from "./identity-converter.js";
import { JsonConverter } from "./json-converter.js";
import { YamlConverter } from "./yaml-converter.js";

/** Reads a UTF-8 text file, returning `undefined` when it cannot be read. */
function readTextFile(input: unknown): string | undefined {
    if (typeof input !== "string" && !(input instanceof URL)) {
        return undefined;
    }

    try {
        return readFileSync(input, "utf8");
    } catch {
        return undefined;
    }
}

/**
 * Reads a JSON file and converts its contents.
 *
 * The file path may be a string or a `URL`. Missing files, unreadable files
 * and malformed JSON all produce `undefined`.
 *
 * @example
 * ```ts
 * const converter = new JsonFileConverter();
 * converter.convert("./package.json"); // { name: "@kyneticweb/parser", ... }
 * ```
 */
export class JsonFileConverter implements IConverter {
    private readonly json = new JsonConverter();

    /**
     * @param serializer Converter applied to the parsed JSON value. Defaults
     * to identity, which returns the parsed object.
     * @example
     * ```ts
     * const converter = new JsonFileConverter(new JsonStringConverter());
     * ```
     */
    public constructor(private readonly serializer: IConverter = new IdentityConverter()) {}

    /**
     * @param input Path (`string` or `URL`) of the JSON file.
     * @returns The converted document, or `undefined` when it cannot be read.
     * @example
     * ```ts
     * new JsonFileConverter().convert("./data.json"); // { ... }
     * ```
     */
    public convert(input: unknown): unknown {
        const text = readTextFile(input);

        if (text === undefined) {
            return undefined;
        }

        const parsed = this.json.parseText(text);

        return parsed === undefined ? undefined : this.serializer.convert(parsed);
    }
}

/**
 * Reads a YAML file and converts its contents.
 *
 * The file path may be a string or a `URL`. Missing files, unreadable files
 * and malformed YAML all produce `undefined`.
 *
 * @example
 * ```ts
 * const converter = new YamlFileConverter();
 * converter.convert("./config.yaml"); // { name: "kynetic" }
 * ```
 */
export class YamlFileConverter implements IConverter {
    private readonly yaml = new YamlConverter();

    /**
     * @param serializer Converter applied to the parsed YAML value. Defaults
     * to identity, which returns the parsed object.
     * @example
     * ```ts
     * const converter = new YamlFileConverter(new JsonStringConverter());
     * ```
     */
    public constructor(private readonly serializer: IConverter = new IdentityConverter()) {}

    /**
     * @param input Path (`string` or `URL`) of the YAML file.
     * @returns The converted document, or `undefined` when it cannot be read.
     * @example
     * ```ts
     * new YamlFileConverter().convert("./config.yaml"); // { ... }
     * ```
     */
    public convert(input: unknown): unknown {
        const text = readTextFile(input);

        if (text === undefined) {
            return undefined;
        }

        const parsed = this.yaml.parse(text);

        return parsed === undefined ? undefined : this.serializer.convert(parsed);
    }
}
