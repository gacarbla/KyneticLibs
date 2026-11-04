import { describe, expect, it } from "vitest";
import { DEFAULT_VERSION_RULES, VersionManager, VersionRules, VersionSchema, pattern } from "../src/index.js";

describe("VersionRules", () => {
    it("creates frozen pattern values", () => {
        const value = pattern("\\d+");
        expect(value).toEqual({ pattern: "\\d+" });
        expect(Object.isFrozen(value)).toBe(true);
    });

    it("never mutates the receiver when adding a rule", () => {
        const base = new VersionRules({ x: [pattern("\\d+")] });
        const extended = base.add("G", ["alpha"]);

        expect(base.get("G")).toBeUndefined();
        expect(extended.get("G")).toEqual(["alpha"]);
        expect(extended).not.toBe(base);
    });

    it("replaces an existing rule in the returned instance", () => {
        const base = new VersionRules({ G: ["alpha"] });
        const extended = base.add("G", ["beta"]);

        expect(base.get("G")).toEqual(["alpha"]);
        expect(extended.get("G")).toEqual(["beta"]);
    });

    it("lists keys alphabetically", () => {
        const rules = new VersionRules({ x: ["1"], G: ["alpha"], a: ["2"] });
        expect(rules.keys()).toEqual(["G", "a", "x"]);
    });

    it("exposes a deep-frozen snapshot", () => {
        const rules = new VersionRules({ G: ["alpha"] });
        const snapshot = rules.toObject();

        expect(Object.isFrozen(snapshot)).toBe(true);
        expect(Object.isFrozen(snapshot.G)).toBe(true);
        expect(Reflect.set(snapshot, "G", ["corrupted"])).toBe(false);
        expect(Reflect.set(snapshot.G ?? [], 0, "corrupted")).toBe(false);
        expect(rules.get("G")).toEqual(["alpha"]);
    });

    it("copies the input object defensively", () => {
        const values: string[] = ["alpha"];
        const rules = new VersionRules({ G: values });
        values.push("corrupted");

        expect(rules.get("G")).toEqual(["alpha"]);
    });

    it("ships the default rules", () => {
        expect(DEFAULT_VERSION_RULES.get("x")).toEqual([pattern("\\d+")]);
        expect(DEFAULT_VERSION_RULES.get("G")).toContain("alpha");
        expect(DEFAULT_VERSION_RULES.keys()).toEqual(["G", "g", "s", "w", "x"]);
    });
});

describe("VersionSchema", () => {
    it("accepts every shape of the default schema", () => {
        const manager = new VersionManager();
        for (const version of ["0.0.1", "1.2.3", "1.2.3.beta", "1.2.3.4"]) {
            expect(manager.satisfies(version)).toBe(true);
        }
    });

    it("rejects versions that do not match the whole schema", () => {
        const manager = new VersionManager();
        for (const version of ["1.2", "1.2.3.", ""]) {
            expect(manager.satisfies(version)).toBe(false);
        }
    });

    it("treats non-structural template characters literally", () => {
        const schema = new VersionSchema("x.x.G-x", DEFAULT_VERSION_RULES);
        expect(schema.test("1.2.alpha-3")).toBe(true);
        expect(schema.test("1.2.alpha.3")).toBe(false);
    });

    it("does not let a later rule corrupt an expanded word", () => {
        const rules = new VersionRules({ G: ["alpha", "beta"], x: [pattern("\\d+")] });
        const schema = new VersionSchema("x.x.G", rules);
        expect(schema.test("1.2.alpha")).toBe(true);

        // In the old implementation, adding "a" after "G" rewrote the schema
        // string and destroyed the word "alpha". Compilation now never scans
        // inserted rule values, so this must keep working.
        const extended = rules.add("a", ["0"]);
        expect(schema.test("1.2.alpha")).toBe(true);
        expect(new VersionSchema("x.x.G", extended).test("1.2.alpha")).toBe(true);
    });

    it("returns named groups and captures repeated keys only once", () => {
        const schema = new VersionSchema("x.x.x.x", DEFAULT_VERSION_RULES);
        expect(schema.parse("1.2.3.4")).toEqual({ x: "1" });
        expect(schema.test("1.2.3")).toBe(false);
    });

    it("returns every participating named group", () => {
        const schema = new VersionSchema("G.x.s", DEFAULT_VERSION_RULES);
        expect(schema.parse("beta.2.#")).toEqual({ G: "beta", x: "2", s: "#" });
    });

    it("returns undefined when the version does not match", () => {
        const schema = new VersionSchema("x.x.G", DEFAULT_VERSION_RULES);
        expect(schema.parse("1.2.3")).toBeUndefined();
    });

    it("rejects rule keys that cannot be named groups", () => {
        const rules = new VersionRules({ "not-valid": ["1"] });
        expect(() => new VersionSchema("x.x.x", rules)).toThrow(/Invalid version rule key "not-valid"/);
    });

    it("rejects rule keys that start with a digit", () => {
        const rules = new VersionRules({ "1x": ["1"] });
        expect(() => new VersionSchema("x", rules)).toThrow(/Invalid version rule key "1x"/);
    });

    it("prefers the longest matching rule key", () => {
        const rules = new VersionRules({ x: ["1"], xx: ["22"] });
        const schema = new VersionSchema("xx", rules);
        expect(schema.test("22")).toBe(true);
        expect(schema.parse("22")).toEqual({ xx: "22" });
    });

    it("ignores inherited object properties when reading rules", () => {
        expect(DEFAULT_VERSION_RULES.get("toString")).toBeUndefined();
        expect(DEFAULT_VERSION_RULES.get("__proto__")).toBeUndefined();
    });

    it("returns an empty result for a schema without rule keys", () => {
        const schema = new VersionSchema("1.0", DEFAULT_VERSION_RULES);

        expect(schema.test("1.0")).toBe(true);
        expect(schema.parse("1.0")).toEqual({});
        expect(schema.parse("2.0")).toBeUndefined();
    });
});
