import { createSignal } from "@kyneticweb/reactive";
import type { I18n, I18nOptions, LocaleMessages, MessageKey, MessageVars, PluralKey } from "./types.js";

/**
 * Reads a persisted locale if it is still available.
 *
 * @param storageKey `localStorage` key.
 * @param messages Available dictionaries.
 * @returns The stored locale, or `undefined`.
 */
function readPersisted(storageKey: string, messages: LocaleMessages): string | undefined {
    if (typeof localStorage === "undefined") {
        return undefined;
    }
    try {
        const stored = localStorage.getItem(storageKey);
        return stored !== null && stored in messages ? stored : undefined;
    } catch {
        return undefined;
    }
}

/** Guesses the locale from the browser languages. */
function detectLocale(messages: LocaleMessages): string | undefined {
    if (typeof navigator === "undefined") {
        return undefined;
    }
    const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const candidate of candidates) {
        if (candidate !== undefined && candidate in messages) {
            return candidate;
        }
        const base = candidate?.split("-")[0];
        if (base === undefined) {
            continue;
        }
        const match = Object.keys(messages).find((locale) => locale.split("-")[0] === base);
        if (match !== undefined) {
            return match;
        }
    }
    return undefined;
}

/** Replaces `{name}` placeholders. */
function interpolate(template: string, vars: MessageVars | undefined): string {
    if (vars === undefined) {
        return template;
    }
    return template.replace(/\{([A-Za-z0-9_]+)\}/g, (_match, key: string) => {
        const value = vars[key];
        return value === undefined ? "" : String(value);
    });
}

/** Internationalisation manager. */
class I18nManager<M extends LocaleMessages> implements I18n<M> {
    public readonly locale;
    public readonly languages: Array<keyof M & string>;

    readonly #messages: M;
    readonly #fallback: keyof M & string;
    readonly #persist: string | undefined;

    public constructor(options: I18nOptions<M>) {
        this.#messages = options.messages;
        this.#fallback = options.fallbackLocale ?? options.locale;
        this.#persist = options.persist;
        this.languages = Object.keys(options.messages) as Array<keyof M & string>;

        const persisted = this.#persist === undefined ? undefined : readPersisted(this.#persist, options.messages);
        const detected = options.detect === true ? detectLocale(options.messages) : undefined;
        const initial = persisted ?? detected ?? String(options.locale);

        this.locale = createSignal(initial);
    }

    /** Changes the active locale. */
    public setLocale(locale: keyof M & string): void {
        if (!(locale in this.#messages)) {
            throw new Error(`Unknown locale "${String(locale)}".`);
        }
        this.locale.set(String(locale));
        if (this.#persist !== undefined && typeof localStorage !== "undefined") {
            try {
                localStorage.setItem(this.#persist, String(locale));
            } catch {
                // Storage can be disabled; the in-memory locale still works.
            }
        }
    }

    /** Translates a key, falling back to the default locale and then to the key. */
    public readonly t = (key: MessageKey<M>, vars?: MessageVars): string => {
        const active = this.locale();
        const dictionary = this.#messages[active] ?? this.#messages[this.#fallback] ?? {};
        const template = dictionary[key] ?? this.#messages[this.#fallback]?.[key] ?? key;
        return interpolate(template, vars);
    };

    /** Translates a plural key (`key.one`, `key.other`, …). */
    public readonly tp = (key: PluralKey<M> | MessageKey<M>, count: number, vars?: MessageVars): string => {
        const active = this.locale();
        const rule = new Intl.PluralRules(active).select(count);
        const dictionary = this.#messages[active] ?? this.#messages[this.#fallback] ?? {};
        const base = dictionary[`${key}.${rule}`] ?? dictionary[`${key}.other`] ?? dictionary[key];
        const fallbackDictionary = this.#messages[this.#fallback] ?? {};
        const template = base ?? fallbackDictionary[`${key}.${rule}`] ?? fallbackDictionary[`${key}.other`] ?? key;
        return interpolate(template, { ...vars, count });
    };

    /** Formats a number with the active locale. */
    public readonly formatNumber = (value: number, options?: Intl.NumberFormatOptions): string => {
        return new Intl.NumberFormat(this.locale(), options).format(value);
    };

    /** Formats a date with the active locale. */
    public readonly formatDate = (value: Date | number, options?: Intl.DateTimeFormatOptions): string => {
        return new Intl.DateTimeFormat(this.locale(), options).format(value);
    };

    /** Reports whether a key exists. */
    public exists(key: string): boolean {
        const active = this.locale();
        return key in (this.#messages[active] ?? {}) || key in (this.#messages[this.#fallback] ?? {});
    }
}

/**
 * Creates a typed internationalisation manager.
 *
 * `t` and `tp` read the locale signal, so calling them inside a component or
 * an effect makes the text reactive.
 *
 * @example
 * ```ts
 * const i18n = createI18n({
 *     locale: "es",
 *     messages: {
 *         es: { hello: "Hola {name}", "items.one": "{count} elemento", "items.other": "{count} elementos" },
 *         en: { hello: "Hello {name}", "items.one": "{count} item", "items.other": "{count} items" },
 *     },
 *     detect: true,
 *     persist: "app:lang",
 * });
 *
 * i18n.t("hello", { name: "Gabe" });
 * i18n.tp("items", 2);
 * ```
 */
export function createI18n<const M extends LocaleMessages>(options: I18nOptions<M>): I18n<M> {
    return new I18nManager(options);
}
