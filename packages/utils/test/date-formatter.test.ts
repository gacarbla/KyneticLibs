import { describe, expect, it } from "vitest";
import { DateFormatter, formatDate } from "../src/date-formatter.js";

const REFERENCE_DATE = new Date(2026, 2, 7, 9, 5, 2);

describe("DateFormatter", () => {
    it("formats every supported token", () => {
        expect(formatDate(REFERENCE_DATE, "YYYY YY MM M DD D HH H mm m ss s")).toBe("2026 26 03 3 07 7 09 9 05 5 02 2");
    });

    it("prefers the longest token", () => {
        expect(formatDate(REFERENCE_DATE, "YYYY")).toBe("2026");
        expect(formatDate(REFERENCE_DATE, "YY")).toBe("26");
    });

    it("keeps bracketed text as a literal", () => {
        expect(formatDate(REFERENCE_DATE, "[Day] D [of] MM")).toBe("Day 7 of 03");
    });

    it("keeps unknown characters untouched", () => {
        expect(formatDate(REFERENCE_DATE, "DD/MM/YYYY - HH:mm")).toBe("07/03/2026 - 09:05");
    });

    it("reuses a compiled formatter", () => {
        const formatter = new DateFormatter("YYYY-MM-DD");
        expect(formatter.format(REFERENCE_DATE)).toBe("2026-03-07");
        expect(formatter.format(new Date(2020, 11, 31))).toBe("2020-12-31");
    });

    it("rejects an empty pattern", () => {
        expect(() => new DateFormatter("")).toThrow(RangeError);
    });

    it("rejects invalid dates", () => {
        expect(() => formatDate(new Date("not a date"), "YYYY")).toThrow(RangeError);
    });

    it("pads short years to four digits", () => {
        expect(formatDate(new Date(999, 0, 1), "YYYY")).toBe("0999");
    });
});
