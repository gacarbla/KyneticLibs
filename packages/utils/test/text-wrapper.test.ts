import { describe, expect, it } from "vitest";
import { wrapText } from "../src/text-wrapper.js";

describe("wrapText", () => {
    it("wraps words that exceed the width", () => {
        expect(wrapText("hello world", 5)).toEqual(["hello", "world"]);
    });

    it("keeps words that fit together on the same line", () => {
        expect(wrapText("hello big world", 12)).toEqual(["hello big", "world"]);
    });

    it("keeps explicit line breaks", () => {
        expect(wrapText("first\nsecond", 20)).toEqual(["first", "second"]);
    });

    it("splits words longer than the width", () => {
        expect(wrapText("abcdefghij", 4)).toEqual(["abcd", "efgh", "ij"]);
    });

    it("returns an empty list for empty input", () => {
        expect(wrapText("", 10)).toEqual([]);
    });

    it("keeps a blank line for whitespace-only paragraphs", () => {
        expect(wrapText("   ", 10)).toEqual([""]);
    });

    it("rejects widths below one", () => {
        expect(() => wrapText("text", 0)).toThrow(RangeError);
        expect(() => wrapText("text", -1)).toThrow(RangeError);
    });
});
