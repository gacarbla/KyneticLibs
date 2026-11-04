import type { InputFormat } from "./types.js";
import type { IConverter } from "./converters/i-converter.js";

/**
 * Key that identifies a conversion inside a {@link ConverterRegistry}.
 *
 * The left side is the input format and the right side is the output format,
 * for example `"string->number"`.
 */
export type ConversionKey = `${InputFormat}->${string}`;

/**
 * Stores converters indexed by their `"from->to"` conversion key.
 *
 * Registries are explicit: they do not guess conversions, and resolving an
 * unknown key throws an error that lists the requested key.
 *
 * @example
 * ```ts
 * const registry = new ConverterRegistry();
 * registry.register("string->number", new NumberConverter());
 * registry.resolve("string->number"); // NumberConverter
 * ```
 */
export class ConverterRegistry {
    private readonly converters = new Map<ConversionKey, IConverter>();

    /**
     * Registers a converter, replacing any previous one with the same key.
     *
     * @param key Conversion key, for example `"string->number"`.
     * @param converter Converter that implements the conversion.
     * @example
     * ```ts
     * registry.register("string->boolean", new BooleanConverter());
     * ```
     */
    public register(key: ConversionKey, converter: IConverter): void {
        this.converters.set(key, converter);
    }

    /**
     * Returns the converter registered for a key.
     *
     * @param key Conversion key, for example `"string->date"`.
     * @returns The registered converter.
     * @throws {Error} When no converter is registered for the key.
     * @example
     * ```ts
     * const converter = registry.resolve("string->date");
     * ```
     */
    public resolve(key: ConversionKey): IConverter {
        const converter = this.converters.get(key);

        if (converter === undefined) {
            throw new Error(`No converter registered for "${key}".`);
        }

        return converter;
    }

    /**
     * Number of registered conversions.
     *
     * @example
     * ```ts
     * registry.size; // 1
     * ```
     */
    public get size(): number {
        return this.converters.size;
    }
}
