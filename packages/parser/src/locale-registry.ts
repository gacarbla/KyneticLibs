import { enUS, esES, glES } from "./locales/index.js";
import type { LocaleDefinition } from "./types.js";

/**
 * Stores locale definitions used to read numbers written as words.
 *
 * A new registry already contains the bundled `es-ES`, `en-US` and `gl-ES`
 * definitions, so it can be used immediately.
 *
 * @example
 * ```ts
 * const locales = new LocaleRegistry();
 * locales.has("es-ES"); // true
 * locales.get("en-US").units.one; // 1
 * ```
 */
export class LocaleRegistry {
    private readonly definitions = new Map<string, LocaleDefinition>();

    /**
     * Creates a registry preloaded with the bundled locales.
     *
     * @example
     * ```ts
     * const locales = new LocaleRegistry();
     * ```
     */
    public constructor() {
        this.register("es-ES", esES);
        this.register("en-US", enUS);
        this.register("gl-ES", glES);
    }

    /**
     * Registers or replaces a locale definition.
     *
     * @param code Locale code, for example `"fr-FR"`.
     * @param definition Words and connectors used by that locale.
     * @example
     * ```ts
     * locales.register("xx-XX", { units: { uno: 1 }, tens: {}, hundreds: {}, scales: {}, connectors: [] });
     * ```
     */
    public register(code: string, definition: LocaleDefinition): void {
        this.definitions.set(code, definition);
    }

    /**
     * Returns a locale definition.
     *
     * @param code Locale code.
     * @returns The registered definition.
     * @throws {Error} When the locale is not registered.
     * @example
     * ```ts
     * const spanish = locales.get("es-ES");
     * ```
     */
    public get(code: string): LocaleDefinition {
        const definition = this.definitions.get(code);

        if (definition === undefined) {
            throw new Error(`Unknown locale "${code}". Available locales: ${this.codes().join(", ")}.`);
        }

        return definition;
    }

    /**
     * Checks whether a locale is registered.
     *
     * @param code Locale code.
     * @returns `true` when the locale exists.
     * @example
     * ```ts
     * locales.has("gl-ES"); // true
     * ```
     */
    public has(code: string): boolean {
        return this.definitions.has(code);
    }

    /**
     * Lists the registered locale codes.
     *
     * @returns Locale codes in registration order.
     * @example
     * ```ts
     * locales.codes(); // ["es-ES", "en-US", "gl-ES"]
     * ```
     */
    public codes(): string[] {
        return [...this.definitions.keys()];
    }
}
