import { describe, expect, it } from "vitest";
import { LogStore } from "../src/index.js";
import type { ConsoleLogEntry, ConsoleLogType } from "../src/index.js";

let nextId = 0;

function makeEntry(type: ConsoleLogType, message: string): ConsoleLogEntry {
    nextId += 1;
    return {
        id: `entry-${nextId}`,
        type,
        message,
        timestamp: new Date(2026, 10, 4, 9, 30, nextId),
    };
}

describe("LogStore", () => {
    it("exposes its configured capacity", () => {
        const store = new LogStore(3);
        expect(store.capacity).toBe(3);
        expect(store.size).toBe(0);
    });

    it("rejects capacities that are not positive integers", () => {
        expect(() => new LogStore(0)).toThrow(RangeError);
        expect(() => new LogStore(-1)).toThrow(RangeError);
        expect(() => new LogStore(1.5)).toThrow(RangeError);
    });

    it("evicts the oldest entry when the buffer is full", () => {
        const store = new LogStore(2);
        store.add(makeEntry("log", "first"));
        store.add(makeEntry("info", "second"));
        store.add(makeEntry("error", "third"));

        expect(store.entries().map((entry) => entry.message)).toEqual(["second", "third"]);
        expect(store.size).toBe(2);
        expect(store.stats().byType.log).toBe(0);
        expect(store.stats().byType.info).toBe(1);
        expect(store.stats().byType.error).toBe(1);
    });

    it("recomputes statistics from the current entries", () => {
        const store = new LogStore(5);
        store.add(makeEntry("log", "one"));
        store.add(makeEntry("log", "two"));
        store.add(makeEntry("warn", "three"));

        const stats = store.stats();
        expect(stats.total).toBe(3);
        expect(stats.byType.log).toBe(2);
        expect(stats.byType.warn).toBe(1);
        expect(stats.byType.error).toBe(0);
    });

    it("returns a defensive copy of its entries", () => {
        const store = new LogStore(5);
        store.add(makeEntry("log", "original"));

        const copy = store.entries();
        copy.length = 0;

        expect(store.entries()).toHaveLength(1);
    });

    it("clears every entry while keeping the capacity", () => {
        const store = new LogStore(2);
        store.add(makeEntry("log", "first"));
        store.add(makeEntry("info", "second"));
        store.clear();

        expect(store.size).toBe(0);
        expect(store.entries()).toEqual([]);
        expect(store.stats().total).toBe(0);
        expect(store.capacity).toBe(2);
    });
});
