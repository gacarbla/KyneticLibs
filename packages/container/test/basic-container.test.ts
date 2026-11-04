import { describe, expect, expectTypeOf, it } from "vitest";
import { BasicContainer, type ReadonlyContainer } from "../src/index.js";

describe("BasicContainer", () => {
    it("starts empty when no initial values are given", () => {
        const container = new BasicContainer<number>();

        expect(container.size).toBe(0);
        expect(container.keys()).toEqual([]);
        expect(container.values()).toEqual([]);
        expect(container.entries()).toEqual([]);
    });

    it("copies the initial values", () => {
        const source = { alice: 10, bob: 8 };
        const container = new BasicContainer<number>(source);

        source.alice = 99;

        expect(container.size).toBe(2);
        expect(container.getOrThrow("alice")).toBe(10);
        expect(container.getOrThrow("bob")).toBe(8);
    });

    it("stores and overwrites values", () => {
        const container = new BasicContainer<string>();

        expect(container.set("name", "Ada")).toBe(container);
        container.set("name", "Grace");

        expect(container.get("name")).toBe("Grace");
        expect(container.size).toBe(1);
    });

    it("returns undefined for a missing key", () => {
        const container = new BasicContainer<number>();

        expect(container.get("missing")).toBeUndefined();
    });

    it("throws a clear error when getOrThrow misses", () => {
        const container = new BasicContainer<number>();

        expect(() => container.getOrThrow("missing")).toThrowError(
            'The container has no value stored for the key "missing".',
        );
    });

    it("reports whether a key exists", () => {
        const container = new BasicContainer<number>({ a: 1 });

        expect(container.has("a")).toBe(true);
        expect(container.has("b")).toBe(false);
    });

    it("deletes entries and reports whether they existed", () => {
        const container = new BasicContainer<number>({ a: 1 });

        expect(container.delete("a")).toBe(true);
        expect(container.delete("a")).toBe(false);
        expect(container.size).toBe(0);
    });

    it("clears every entry", () => {
        const container = new BasicContainer<number>({ a: 1, b: 2 });

        container.clear();

        expect(container.size).toBe(0);
        expect(container.get("a")).toBeUndefined();
    });

    it("exposes keys, values and entries in insertion order", () => {
        const container = new BasicContainer<number>({ first: 1, second: 2 });

        expect(container.keys()).toEqual(["first", "second"]);
        expect(container.values()).toEqual([1, 2]);
        expect(container.entries()).toEqual([
            ["first", 1],
            ["second", 2],
        ]);
    });

    it("returns defensive copies of its collections", () => {
        const container = new BasicContainer<number>({ a: 1 });
        const keys = container.keys();
        const entries = container.entries();

        keys.push("b");
        entries.push(["c", 3]);

        expect(container.keys()).toEqual(["a"]);
        expect(container.entries()).toEqual([["a", 1]]);
    });

    it("clones without sharing state", () => {
        const original = new BasicContainer<number>({ count: 1 });
        const copy = original.clone();

        copy.set("count", 2);
        copy.set("extra", 3);

        expect(original.getOrThrow("count")).toBe(1);
        expect(original.has("extra")).toBe(false);
        expect(copy.getOrThrow("count")).toBe(2);
        expect(copy.size).toBe(2);
    });

    it("serialises to a plain object copy", () => {
        const container = new BasicContainer<number>({ a: 1, b: 2 });
        const json = container.toJSON();

        expect(json).toEqual({ a: 1, b: 2 });
        expect(json).not.toBe(container.toJSON());

        json.a = 99;
        expect(container.getOrThrow("a")).toBe(1);
    });

    it("keeps its value type", () => {
        const container = new BasicContainer<number>({ key: 1 });

        expectTypeOf(container.get("key")).toEqualTypeOf<number | undefined>();
        expectTypeOf(container.getOrThrow("key")).toEqualTypeOf<number>();
        expectTypeOf(container.values()).toEqualTypeOf<number[]>();
    });

    it("can be used through the read-only interface", () => {
        const container: ReadonlyContainer<string, number> = new BasicContainer<number>({ a: 1 });

        expect(container.size).toBe(1);
        expect(container.getOrThrow("a")).toBe(1);
        expect(container.entries()).toEqual([["a", 1]]);
    });

    it("identifies its package", () => {
        expect(new BasicContainer<number>().toolKind).toBe("container");
    });

    it("preserves insertion order when cloning", () => {
        const container = new BasicContainer<number>();
        container.set("b", 1).set("1", 2).set("a", 3);

        expect(container.clone().keys()).toEqual(["b", "1", "a"]);
    });
});
