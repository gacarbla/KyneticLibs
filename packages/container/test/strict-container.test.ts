import { describe, expect, expectTypeOf, it } from "vitest";
import { StrictContainer, type ReadonlyContainer } from "../src/index.js";

type Settings = {
    count: number;
    name: string;
    compact: boolean;
};

describe("StrictContainer", () => {
    it("accepts a partial initial map", () => {
        const container = new StrictContainer<Settings>({ count: 2 });

        expect(container.size).toBe(1);
        expect(container.getOrThrow("count")).toBe(2);
        expect(container.has("name")).toBe(false);
    });

    it("stores and overwrites values", () => {
        const container = new StrictContainer<Settings>();

        expect(container.set("count", 3)).toBe(container);
        container.set("count", 4);

        expect(container.get("count")).toBe(4);
    });

    it("keeps the value type of each key", () => {
        const container = new StrictContainer<Settings>();

        container.set("count", 3).set("name", "Ada").set("compact", true);

        expectTypeOf(container.get("count")).toEqualTypeOf<number | undefined>();
        expectTypeOf(container.get("name")).toEqualTypeOf<string | undefined>();
        expectTypeOf(container.getOrThrow("compact")).toEqualTypeOf<boolean>();
        expectTypeOf(container.keys()).toEqualTypeOf<Array<keyof Settings & string>>();
        expectTypeOf(container.values()).toEqualTypeOf<Array<string | number | boolean>>();
    });

    it("returns undefined for a missing key", () => {
        expect(new StrictContainer<Settings>().get("count")).toBeUndefined();
    });

    it("throws a clear error when getOrThrow misses", () => {
        const container = new StrictContainer<Settings>();

        expect(() => container.getOrThrow("name")).toThrowError(
            'The container has no value stored for the key "name".',
        );
    });

    it("deletes entries and reports whether they existed", () => {
        const container = new StrictContainer<Settings>({ count: 1 });

        expect(container.delete("count")).toBe(true);
        expect(container.delete("count")).toBe(false);
        expect(container.size).toBe(0);
    });

    it("clears every entry", () => {
        const container = new StrictContainer<Settings>({ count: 1, name: "Ada" });

        container.clear();

        expect(container.size).toBe(0);
        expect(container.keys()).toEqual([]);
    });

    it("exposes keys, values and entries in insertion order", () => {
        const container = new StrictContainer<Settings>({ count: 1, name: "Ada" });

        expect(container.keys()).toEqual(["count", "name"]);
        expect(container.values()).toEqual([1, "Ada"]);
        expect(container.entries()).toEqual([
            ["count", 1],
            ["name", "Ada"],
        ]);
    });

    it("clones without sharing state", () => {
        const original = new StrictContainer<Settings>({ count: 1, name: "Ada" });
        const copy = original.clone();

        copy.set("count", 2);
        copy.set("compact", true);

        expect(original.getOrThrow("count")).toBe(1);
        expect(original.has("compact")).toBe(false);
        expect(copy.getOrThrow("count")).toBe(2);
        expect(copy.size).toBe(3);
    });

    it("serialises to a partial object copy", () => {
        const container = new StrictContainer<Settings>({ count: 1, compact: false });
        const json = container.toJSON();

        expect(json).toEqual({ count: 1, compact: false });

        json.count = 99;
        expect(container.getOrThrow("count")).toBe(1);
    });

    it("can be used through the read-only interface", () => {
        const container: ReadonlyContainer<keyof Settings & string, Settings[keyof Settings]> =
            new StrictContainer<Settings>({ count: 1 });

        expect(container.size).toBe(1);
        expect(container.getOrThrow("count")).toBe(1);
    });

    it("identifies its package", () => {
        expect(new StrictContainer<Settings>().toolKind).toBe("container");
    });
});
