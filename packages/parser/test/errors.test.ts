import { describe, expect, it } from "vitest";
import { ConverterRegistry, LocaleRegistry, ParseError, Parser } from "../src/index.js";

const parser = new Parser();

describe("Parser error handling", () => {
    it("throws a ParseError with context from parseOrThrow", () => {
        let caught: unknown;

        try {
            parser.parseOrThrow("string", "number", "abc");
        } catch (error) {
            caught = error;
        }

        expect(caught).toBeInstanceOf(ParseError);

        if (caught instanceof ParseError) {
            expect(caught.from).toBe("string");
            expect(caught.to).toBe("number");
            expect(caught.input).toBe("abc");
            expect(caught.message).toContain("string");
        }
    });

    it("returns a discriminated result from tryParse", () => {
        expect(parser.tryParse("string", "number", "12")).toEqual({ ok: true, value: 12 });

        const failure = parser.tryParse("string", "number", "abc");

        expect(failure.ok).toBe(false);
        expect(failure.ok ? undefined : failure.error).toBeInstanceOf(ParseError);
    });

    it("never throws from parse", () => {
        expect(() => parser.parse("string", "number", "abc")).not.toThrow();
        expect(parser.parse("string", "number", "abc")).toBeUndefined();
    });
});

describe("Registries", () => {
    it("reports missing converters with a readable error", () => {
        const registry = new ConverterRegistry();

        expect(() => registry.resolve("string->number")).toThrow(/No converter registered/);
        expect(registry.size).toBe(0);
    });

    it("reports missing locales with a readable error", () => {
        const registry = new LocaleRegistry();

        expect(() => registry.get("zz-ZZ")).toThrow(/Unknown locale/);
        expect(registry.codes()).toEqual(["es-ES", "en-US", "gl-ES"]);
    });
});
