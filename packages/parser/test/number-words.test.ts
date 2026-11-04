import { describe, expect, it } from "vitest";
import { NumberWordsParser, Parser } from "../src/index.js";
import type { LocaleDefinition } from "../src/index.js";

const parser = new Parser();

describe("NumberWordsParser", () => {
    it("reads Spanish units, tens and hundreds", () => {
        expect(parser.textToNumber("veintiuno")).toBe(21);
        expect(parser.textToNumber("treinta y uno")).toBe(31);
        expect(parser.textToNumber("ciento veinte")).toBe(120);
        expect(parser.textToNumber("mil doscientos")).toBe(1200);
    });

    it("reads scale words", () => {
        expect(parser.textToNumber("mil")).toBe(1000);
        expect(parser.textToNumber("dos mil")).toBe(2000);
        expect(parser.textToNumber("un millon")).toBe(1_000_000);
        expect(parser.textToNumber("Tresmil cuatrocientos cincuenta y tres")).toBe(3453);
    });

    it("ignores accents and hyphenated words", () => {
        expect(parser.textToNumber("dieciséis")).toBe(16);
        expect(parser.textToNumber("veintidós")).toBe(22);
    });

    it("reads other bundled locales", () => {
        expect(parser.textToNumber("one thousand two hundred", "en-US")).toBe(1200);
        expect(parser.textToNumber("twenty-one", "en-US")).toBe(21);
        expect(parser.textToNumber("dous mil", "gl-ES")).toBe(2000);
    });

    it("returns zero when there are no numeric words", () => {
        expect(parser.textToNumber("nada que ver")).toBe(0);
        expect(new NumberWordsParser().parse("")).toBe(0);
    });

    it("uses locales registered after construction", () => {
        const custom: LocaleDefinition = {
            units: { uno: 1, dos: 2 },
            tens: {},
            hundreds: {},
            scales: { mil: 1000 },
            connectors: ["y"],
        };

        parser.registerLocale("xx-XX", custom);

        expect(parser.locales.has("xx-XX")).toBe(true);
        expect(parser.textToNumber("dos mil uno", "xx-XX")).toBe(2001);
    });
});
