import type { Signal } from "@kyneticweb/reactive";

/** Variables interpolated into a message. */
export type MessageVars = Readonly<Record<string, string | number>>;

/** Messages of one locale: key → template. */
export type MessageDictionary = Readonly<Record<string, string>>;

/** Locale → messages. */
export type LocaleMessages = Readonly<Record<string, MessageDictionary>>;

/** Every key available in any locale. */
export type MessageKey<M extends LocaleMessages> = {
    [L in keyof M]: keyof M[L];
}[keyof M] &
    string;

/** Plural suffixes understood by {@link I18n.tp}. */
export type PluralSuffix = "zero" | "one" | "two" | "few" | "many" | "other";

/** Base keys that have at least one plural form, for example `items` in `items.one`. */
export type PluralKey<M extends LocaleMessages> = {
    [K in MessageKey<M>]: K extends `${infer Base}.${PluralSuffix}` ? Base : never;
}[MessageKey<M>];

/** Options accepted by {@link createI18n}. */
export interface I18nOptions<M extends LocaleMessages> {
    /** Initial locale. */
    readonly locale: keyof M & string;
    /** Dictionaries by locale. */
    readonly messages: M;
    /** Locale used when a key is missing. Defaults to the initial locale. */
    readonly fallbackLocale?: keyof M & string;
    /** Detect the browser language on creation. */
    readonly detect?: boolean;
    /** `localStorage` key used to remember the locale. */
    readonly persist?: string;
}

/** Public internationalisation facade. */
export interface I18n<M extends LocaleMessages> {
    /** Active locale, reactive. */
    readonly locale: Signal<string>;
    /** Available locales. */
    readonly languages: Array<keyof M & string>;
    /** Changes the locale and persists it when configured. */
    setLocale(locale: keyof M & string): void;
    /** Translates a key with `{placeholder}` interpolation. */
    t(key: MessageKey<M>, vars?: MessageVars): string;
    /** Translates a plural key using `Intl.PluralRules`. */
    tp(key: PluralKey<M> | MessageKey<M>, count: number, vars?: MessageVars): string;
    /** Formats a number with the active locale. */
    formatNumber(value: number, options?: Intl.NumberFormatOptions): string;
    /** Formats a date with the active locale. */
    formatDate(value: Date | number, options?: Intl.DateTimeFormatOptions): string;
    /** Reports whether a key exists in the active or fallback locale. */
    exists(key: string): boolean;
}
