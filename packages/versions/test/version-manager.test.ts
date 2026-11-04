import { describe, expect, it } from "vitest";
import { VersionManager } from "../src/index.js";

describe("VersionManager", () => {
    it("starts from the documented defaults", () => {
        const manager = new VersionManager();
        expect(manager.toolKind).toBe("versions");
        expect(manager.version).toBe("0.0.1");
        expect(manager.schema).toBe("x.x.(x|w)(.(g|G|x))?");
    });

    it("rejects an initial version that does not match the schema", () => {
        expect(() => new VersionManager("x.x.x", "1.2")).toThrow(/does not match/);
    });

    it("validates versions in setVersion", () => {
        const manager = new VersionManager();
        expect(manager.setVersion("1.2.3").version).toBe("1.2.3");
        expect(() => manager.setVersion("1.2")).toThrow(/does not match/);
        expect(manager.version).toBe("1.2.3");
    });

    it("exposes frozen rules", () => {
        const manager = new VersionManager();
        const rules = manager.rules;

        expect(Object.isFrozen(rules)).toBe(true);
        expect(Object.isFrozen(rules.G)).toBe(true);
        expect(Reflect.set(rules, "G", ["corrupted"])).toBe(false);
        expect(manager.satisfies("1.2.alpha")).toBe(true);
    });

    it("bumps major and drops the suffix", () => {
        expect(new VersionManager(undefined, "2.3.4.beta").bump("major").version).toBe("3.0.0");
    });

    it("bumps minor and patch", () => {
        expect(new VersionManager(undefined, "2.3.4").bump("minor").version).toBe("2.4.0");
        expect(new VersionManager(undefined, "2.3.4").bump("patch").version).toBe("2.3.5");
    });

    it("bumps prerelease by appending the default suffix", () => {
        expect(new VersionManager(undefined, "2.3.4").bump("prerelease").version).toBe("2.3.4.beta");
    });

    it("refuses to bump a prerelease that already has a suffix", () => {
        expect(() => new VersionManager(undefined, "2.3.4.beta").bump("prerelease")).toThrow(/not supported/);
    });

    it("refuses to bump a version that is not numeric-shaped", () => {
        const manager = new VersionManager("x.x.w", "1.2.beta");
        expect(() => manager.bump("patch")).toThrow(/numeric version/);
    });

    it("compares numeric segments by value", () => {
        const manager = new VersionManager(undefined, "1.2.3");
        expect(manager.compare("1.2.2")).toBe(1);
        expect(manager.compare("1.2.3")).toBe(0);
        expect(manager.compare("1.2.4")).toBe(-1);
        expect(manager.compare("1.10.0")).toBe(-1);
    });

    it("compares the suffix lexicographically", () => {
        expect(new VersionManager(undefined, "1.2.3.beta").compare("1.2.3.alpha")).toBe(1);
        expect(new VersionManager(undefined, "1.2.3.alpha").compare("1.2.3.beta")).toBe(-1);
        expect(new VersionManager(undefined, "1.2.3.alpha").compare("1.2.3.alpha")).toBe(0);
    });

    it("compares versions with different lengths without throwing", () => {
        const manager = new VersionManager(undefined, "1.2.0");
        expect(manager.compare("1.2")).toBe(0);
        expect(manager.compare("1.2.1")).toBe(-1);
        expect(manager.compare("1")).toBe(1);
    });

    it("checks a custom schema in satisfies", () => {
        const manager = new VersionManager();
        expect(manager.satisfies("1.2.3", "x.x.x")).toBe(true);
        expect(manager.satisfies("1.2.3.4", "x.x.x")).toBe(false);
        expect(manager.satisfies("1.2.alpha", "x.x.G")).toBe(true);
        expect(manager.satisfies("1.2.alpha", "x.x.g")).toBe(false);
    });

    it("parses the current version by default", () => {
        const manager = new VersionManager(undefined, "1.2.3.beta");
        expect(manager.parse()).toEqual({ x: "1", G: "beta" });
        expect(manager.parse("1.2.3")).toEqual({ x: "1" });
        expect(manager.parse("1.2")).toBeUndefined();
    });

    it("ranks a release above its prereleases", () => {
        expect(new VersionManager(undefined, "1.2.3").compare("1.2.3.beta")).toBe(1);
        expect(new VersionManager(undefined, "1.2.3.beta").compare("1.2.3")).toBe(-1);
    });
});
