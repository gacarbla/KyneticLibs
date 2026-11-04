import { describe, expect, it, vi } from "vitest";
import { batch, createComputed, createEffect, createRoot, createSignal, onCleanup, untrack } from "../src/index.js";

/** Waits for the microtask queue used by the scheduler. */
async function tick(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
}

describe("createSignal", () => {
    it("reads, writes and updates", () => {
        const count = createSignal(0);

        expect(count()).toBe(0);
        expect(count.set(2)).toBe(2);
        expect(count.update((value) => value + 1)).toBe(3);
        expect(count.peek()).toBe(3);
    });

    it("does not notify when the value is equal", async () => {
        const count = createSignal(1);
        const listener = vi.fn();

        createEffect(() => {
            count();
            listener();
        });
        await tick();
        listener.mockClear();

        count.set(1);
        await tick();

        expect(listener).not.toHaveBeenCalled();
    });

    it("supports a custom equality", async () => {
        const point = createSignal({ x: 0 }, { equals: (a, b) => a.x === b.x });
        const listener = vi.fn();

        createEffect(() => {
            point();
            listener();
        });
        await tick();
        listener.mockClear();

        point.set({ x: 0 });
        await tick();
        expect(listener).not.toHaveBeenCalled();

        point.set({ x: 1 });
        await tick();
        expect(listener).toHaveBeenCalledTimes(1);
    });
});

describe("createComputed", () => {
    it("derives and caches values", () => {
        const count = createSignal(2);
        const doubled = createComputed(() => count() * 2);

        expect(doubled()).toBe(4);
        expect(doubled()).toBe(4);

        count.set(3);
        expect(doubled()).toBe(6);
    });

    it("tracks dependencies discovered while running", async () => {
        const useFirst = createSignal(true);
        const first = createSignal("a");
        const second = createSignal("b");
        const selected = createComputed(() => (useFirst() ? first() : second()));
        const seen: string[] = [];

        createEffect(() => {
            seen.push(selected());
        });
        await tick();

        second.set("B");
        await tick();
        expect(seen).toEqual(["a"]);

        useFirst.set(false);
        await tick();
        expect(seen).toEqual(["a", "B"]);
    });
});

describe("createEffect", () => {
    it("runs immediately and on change", async () => {
        const count = createSignal(0);
        const seen: number[] = [];

        createEffect(() => {
            seen.push(count());
        });
        await tick();
        count.set(1);
        await tick();
        count.set(2);
        await tick();

        expect(seen).toEqual([0, 1, 2]);
    });

    it("batches writes into a single run", async () => {
        const first = createSignal(0);
        const second = createSignal(0);
        const run = vi.fn();

        createEffect(() => {
            first();
            second();
            run();
        });
        await tick();
        run.mockClear();

        batch(() => {
            first.set(1);
            second.set(2);
        });
        await tick();

        expect(run).toHaveBeenCalledTimes(1);
    });

    it("runs cleanups before each re-execution and on dispose", async () => {
        const count = createSignal(0);
        const cleanup = vi.fn();

        const dispose = createEffect(() => {
            count();
            onCleanup(cleanup);
        });
        await tick();
        count.set(1);
        await tick();
        dispose();
        dispose();

        expect(cleanup).toHaveBeenCalledTimes(2);
    });
});

describe("createRoot", () => {
    it("disposes every effect created inside", async () => {
        const count = createSignal(0);
        const run = vi.fn();

        const dispose = createRoot((release) => {
            createEffect(() => {
                count();
                run();
            });
            return release;
        });
        await tick();
        run.mockClear();

        dispose();
        count.set(1);
        await tick();

        expect(run).not.toHaveBeenCalled();
    });

    it("disposes nested roots", () => {
        const cleanup = vi.fn();

        const dispose = createRoot((release) => {
            createRoot(() => {
                onCleanup(cleanup);
            });
            return release;
        });

        dispose();
        expect(cleanup).toHaveBeenCalledTimes(1);
    });
});

describe("untrack", () => {
    it("reads without subscribing", async () => {
        const tracked = createSignal(0);
        const ignored = createSignal(0);
        const run = vi.fn();

        createEffect(() => {
            tracked();
            untrack(() => ignored());
            run();
        });
        await tick();
        run.mockClear();

        ignored.set(1);
        await tick();
        expect(run).not.toHaveBeenCalled();

        tracked.set(1);
        await tick();
        expect(run).toHaveBeenCalledTimes(1);
    });
});
