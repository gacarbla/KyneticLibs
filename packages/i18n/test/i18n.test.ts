// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEffect } from "@kyneticweb/reactive";
import { createI18n } from "../src/index.js";
import type { I18n } from "../src/index.js";

async function tick(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
}

const messages = {
    es: {
        hello: "Hola {name}",
        onlySpanish: "Solo español",
        "items.one": "{count} elemento",
        "items.other": "{count} elementos",
    },
    en: {
        hello: "Hello {name}",
        "items.one": "{count} item",
        "items.other": "{count} items",
    },
} as const;

beforeEach(() => {
    localStorage.clear();
});

afterEach(() => {
    localStorage.clear();
});

describe("messages", () => {
    it("interpolates variables", () => {
        const i18n = createI18n({ locale: "es", messages });

        expect(i18n.t("hello", { name: "Gabe" })).toBe("Hola Gabe");
        expect(i18n.locale()).toBe("es");
        expect(i18n.languages).toEqual(["es", "en"]);
    });

    it("falls back to the fallback locale and then to the key", () => {
        const i18n = createI18n({ locale: "en", messages, fallbackLocale: "es" });

        expect(i18n.t("onlySpanish")).toBe("Solo español");
        expect(i18n.exists("onlySpanish")).toBe(true);
        expect(i18n.exists("missing")).toBe(false);

        const loose = i18n.t as (key: string) => string;
        expect(loose("missing")).toBe("missing");
    });

    it("rejects unknown locales", () => {
        const i18n = createI18n({ locale: "es", messages });
        expect(() => i18n.setLocale("fr" as "es")).toThrow('Unknown locale "fr"');
    });

    it("keeps the key type strict", () => {
        const typecheck = (i18n: I18n<typeof messages>): void => {
            i18n.t("hello");
            // @ts-expect-error - unknown message key.
            i18n.t("nope");
        };
        void typecheck;
    });
});

describe("reactivity", () => {
    it("updates translations when the locale changes", async () => {
        const i18n = createI18n({ locale: "es", messages });
        const seen: string[] = [];

        createEffect(() => {
            seen.push(i18n.t("hello", { name: "Gabe" }));
        });
        await tick();

        i18n.setLocale("en");
        await tick();

        expect(seen).toEqual(["Hola Gabe", "Hello Gabe"]);
    });
});

describe("plurals", () => {
    it("selects the plural form with Intl.PluralRules", () => {
        const i18n = createI18n({ locale: "en", messages });

        expect(i18n.tp("items", 1)).toBe("1 item");
        expect(i18n.tp("items", 3)).toBe("3 items");

        i18n.setLocale("es");
        expect(i18n.tp("items", 1)).toBe("1 elemento");
        expect(i18n.tp("items", 3)).toBe("3 elementos");
    });

    it("uses the other form when the exact rule is missing", () => {
        const i18n = createI18n({
            locale: "es",
            messages: { es: { "files.other": "{count} archivos" } },
        });

        expect(i18n.tp("files", 1)).toBe("1 archivos");
    });
});

describe("formatting", () => {
    it("formats numbers and dates with the active locale", () => {
        const i18n = createI18n({ locale: "en", messages });
        const date = new Date(2026, 0, 2);

        expect(i18n.formatNumber(1234.5)).toBe(new Intl.NumberFormat("en").format(1234.5));
        expect(i18n.formatDate(date)).toBe(new Intl.DateTimeFormat("en").format(date));
    });
});

describe("persistence and detection", () => {
    it("persists the locale in localStorage", () => {
        const first = createI18n({ locale: "es", messages, persist: "test:lang" });
        first.setLocale("en");

        const second = createI18n({ locale: "es", messages, persist: "test:lang" });
        expect(second.locale()).toBe("en");
    });

    it("detects the browser language", () => {
        Object.defineProperty(window.navigator, "language", { value: "en-US", configurable: true });
        Object.defineProperty(window.navigator, "languages", { value: ["en-US"], configurable: true });

        const i18n = createI18n({ locale: "es", messages, detect: true });
        expect(i18n.locale()).toBe("en");
    });
});
