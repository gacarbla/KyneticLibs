import { describe, expectTypeOf, it } from "vitest";
import { Parser } from "../src/index.js";
import type { ParseError } from "../src/index.js";

describe("Parser typing", () => {
    const parser = new Parser();

    it("infers the output type of every conversion family", () => {
        expectTypeOf(parser.parse("string", "number", "12")).toEqualTypeOf<number | undefined>();
        expectTypeOf(parser.parse("string", "boolean", "yes")).toEqualTypeOf<boolean | undefined>();
        expectTypeOf(parser.parse("string", "date", "2026-11-04")).toEqualTypeOf<Date | undefined>();
        expectTypeOf(parser.parse("string", "object", "{}")).toEqualTypeOf<Record<string, unknown> | undefined>();
        expectTypeOf(parser.parse("number", "string", 12)).toEqualTypeOf<string | undefined>();
        expectTypeOf(parser.parse("boolean", "number", true)).toEqualTypeOf<number | undefined>();
        expectTypeOf(parser.parse("date", "string", new Date())).toEqualTypeOf<string | undefined>();
        expectTypeOf(parser.parse("stringDate", "date", "2026-11-04")).toEqualTypeOf<Date | undefined>();
    });

    it("distinguishes YAML serialisation from YAML parsing", () => {
        expectTypeOf(parser.parse("object", "yaml", {})).toEqualTypeOf<string | undefined>();
        expectTypeOf(parser.parse("string", "yaml", "a: 1")).toEqualTypeOf<Record<string, unknown> | undefined>();
        expectTypeOf(parser.parse("yaml", "yaml", "file.yaml")).toEqualTypeOf<string | undefined>();
        expectTypeOf(parser.parse("json", "yaml", "file.json")).toEqualTypeOf<string | undefined>();
    });

    it("keeps the pattern formatter typed as a function", () => {
        expectTypeOf(parser.parse("datePattern", "function", "YYYY")).toEqualTypeOf<
            ((date: Date) => string) | undefined
        >();
    });

    it("wraps failures in a discriminated result", () => {
        expectTypeOf(parser.tryParse("string", "number", "12")).toEqualTypeOf<
            { readonly ok: true; readonly value: number } | { readonly ok: false; readonly error: ParseError }
        >();
    });
});
