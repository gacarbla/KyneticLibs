import { describe, expect, it } from "vitest";
import { randomId } from "../src/identifier.js";

describe("randomId", () => {
    it("generates ten characters by default", () => {
        expect(randomId()).toHaveLength(10);
    });

    it("honours a custom length", () => {
        expect(randomId(4)).toHaveLength(4);
    });

    it("only uses hexadecimal characters", () => {
        expect(randomId(32)).toMatch(/^[0-9a-f]{32}$/);
    });

    it("generates different identifiers", () => {
        expect(randomId()).not.toBe(randomId());
    });

    it("rejects lengths outside the supported range", () => {
        expect(() => randomId(0)).toThrow(RangeError);
        expect(() => randomId(33)).toThrow(RangeError);
    });
});
