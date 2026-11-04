import { describe, expect, it } from "vitest";
import { Parser } from "../src/index.js";

const parser = new Parser();

describe("Parser boolean conversions", () => {
    it("reads truthy words and numbers", () => {
        expect(parser.parse("string", "boolean", "True")).toBe(true);
        expect(parser.parse("string", "boolean", "TRUE")).toBe(true);
        expect(parser.parse("string", "boolean", "yes")).toBe(true);
        expect(parser.parse("string", "boolean", "1")).toBe(true);
        expect(parser.parse("string", "boolean", "on")).toBe(true);
        expect(parser.parse("number", "boolean", 1)).toBe(true);
    });

    it("reads falsy words and numbers", () => {
        expect(parser.parse("string", "boolean", "false")).toBe(false);
        expect(parser.parse("string", "boolean", "0")).toBe(false);
        expect(parser.parse("string", "boolean", "no")).toBe(false);
        expect(parser.parse("string", "boolean", "off")).toBe(false);
        expect(parser.parse("number", "boolean", 0)).toBe(false);
    });

    it("rejects unknown words", () => {
        expect(parser.parse("string", "boolean", "maybe")).toBeUndefined();
        expect(parser.parse("string", "boolean", "")).toBeUndefined();
    });
});

describe("Parser number conversions", () => {
    it("reads plain and comma-separated numbers", () => {
        expect(parser.parse("string", "number", "12")).toBe(12);
        expect(parser.parse("string", "number", " 12 ")).toBe(12);
        expect(parser.parse("string", "number", "12,5")).toBe(12.5);
        expect(parser.parse("string", "number", "0x10")).toBe(16);
    });

    it("rejects invalid numbers", () => {
        expect(parser.parse("string", "number", "abc")).toBeUndefined();
        expect(parser.parse("string", "number", "")).toBeUndefined();
    });

    it("converts numbers to strings and booleans", () => {
        expect(parser.parse("number", "string", 12)).toBe("12");
        expect(parser.parse("number", "boolean", 2)).toBe(true);
    });
});

describe("Parser date conversions", () => {
    it("parses valid dates and rejects invalid ones", () => {
        const date = parser.parse("string", "date", "2025-11-02T12:00:00Z");

        expect(date).toBeInstanceOf(Date);
        expect(parser.parse("string", "date", "not-a-date")).toBeUndefined();
        expect(parser.parse("stringDate", "date", "not-a-date")).toBeUndefined();
    });

    it("converts dates to ISO strings and timestamps", () => {
        const date = new Date("2025-11-02T12:00:00Z");

        expect(parser.parse("date", "string", date)).toBe(date.toISOString());
        expect(parser.parse("date", "number", date)).toBe(date.getTime());
        expect(parser.parse("date", "date", date)).toBe(date);
    });

    it("builds date formatters from patterns", () => {
        const format = parser.parse("datePattern", "function", "YYYY-MM-DD");

        expect(format).toBeTypeOf("function");

        if (format !== undefined) {
            expect(format(new Date(2026, 10, 4, 9, 5, 2))).toBe("2026-11-04");
        }
    });
});
