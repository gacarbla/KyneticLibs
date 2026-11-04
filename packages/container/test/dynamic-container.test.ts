import { describe, expect, expectTypeOf, it } from "vitest";
import { DynamicContainer, type ReadonlyContainer } from "../src/index.js";

describe("DynamicContainer", () => {
    it("starts empty by default", () => {
        const container = new DynamicContainer();

        expect(container.size).toBe(0);
        expect(container.keys()).toEqual([]);
    });

    it("accepts a partial initial map", () => {
        const container = new DynamicContainer<{ ready: boolean }>({ ready: true });

        expect(container.size).toBe(1);
        expect(container.getOrThrow("ready")).toBe(true);
    });

    it("adds a key on a new container without mutating the original", () => {
        const original = new DynamicContainer();
        const extended = original.addKey<"count", number>("count");

        expect(original.size).toBe(0);
        expect(original.toJSON()).toEqual({});
        expect(extended.has("count")).toBe(true);
        expect(extended.size).toBe(1);
        expect(extended.get("count")).toBeUndefined();
        expect(() => extended.getOrThrow("count")).toThrow("has no value stored");
    });

    it("adds a value on a new container without mutating the original", () => {
        const original = new DynamicContainer();
        const extended = original.withValue("count", 3);

        expect(original.size).toBe(0);
        expect(original.toJSON()).toEqual({});
        expect(extended.getOrThrow("count")).toBe(3);
        expectTypeOf(extended.get("count")).toEqualTypeOf<number | undefined>();
        expectTypeOf(extended.getOrThrow("count")).toEqualTypeOf<number>();
    });

    it("allows chaining key declarations and values", () => {
        const container = new DynamicContainer().addKey<"name", string>("name").withValue("count", 2);

        container.set("name", "Ada");

        expect(container.getOrThrow("name")).toBe("Ada");
        expect(container.getOrThrow("count")).toBe(2);
    });

    it("stores and overwrites values", () => {
        const container = new DynamicContainer<{ count: number }>();

        expect(container.set("count", 1)).toBe(container);
        container.set("count", 2);

        expect(container.get("count")).toBe(2);
    });

    it("returns undefined for a missing key", () => {
        expect(new DynamicContainer<{ count: number }>().get("count")).toBeUndefined();
    });

    it("throws a clear error when getOrThrow misses", () => {
        const container = new DynamicContainer<{ count: number }>();

        expect(() => container.getOrThrow("count")).toThrowError(
            'The container has no value stored for the key "count".',
        );
    });

    it("deletes entries and reports whether they existed", () => {
        const container = new DynamicContainer<{ count: number }>({ count: 1 });

        expect(container.delete("count")).toBe(true);
        expect(container.delete("count")).toBe(false);
        expect(container.size).toBe(0);
    });

    it("clears every entry", () => {
        const container = new DynamicContainer<{ count: number; name: string }>({ count: 1, name: "Ada" });

        container.clear();

        expect(container.size).toBe(0);
        expect(container.entries()).toEqual([]);
    });

    it("exposes keys, values and entries in insertion order", () => {
        const container = new DynamicContainer<{ count: number; name: string }>({ count: 1, name: "Ada" });

        expect(container.keys()).toEqual(["count", "name"]);
        expect(container.values()).toEqual([1, "Ada"]);
        expect(container.entries()).toEqual([
            ["count", 1],
            ["name", "Ada"],
        ]);
    });

    it("clones without sharing state", () => {
        const original = new DynamicContainer<{ count: number }>({ count: 1 });
        const copy = original.clone();

        copy.set("count", 2);

        expect(original.getOrThrow("count")).toBe(1);
        expect(copy.getOrThrow("count")).toBe(2);
    });

    it("serialises to a partial object copy", () => {
        const container = new DynamicContainer<{ count: number; name: string }>({ count: 1 });
        const json = container.toJSON();

        expect(json).toEqual({ count: 1 });

        json.count = 99;
        expect(container.getOrThrow("count")).toBe(1);
    });

    it("can be used through the read-only interface", () => {
        const container: ReadonlyContainer<"count", number> = new DynamicContainer<{ count: number }>({ count: 1 });

        expect(container.size).toBe(1);
        expect(container.getOrThrow("count")).toBe(1);
    });

    it("identifies its package", () => {
        expect(new DynamicContainer().toolKind).toBe("container");
    });
});
