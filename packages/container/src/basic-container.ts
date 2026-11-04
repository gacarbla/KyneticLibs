import { ItemStore } from "./item-store.js";
import type { ReadonlyContainer } from "./readonly-container.js";

/**
 * Container with free-form string keys and one value type.
 *
 * Use it when every value shares the same type and keys are decided at
 * runtime.
 *
 * @example
 * ```ts
 * const scores = new BasicContainer<number>({ alice: 10 });
 * scores.set("bob", 8);
 * scores.getOrThrow("alice"); // 10
 * ```
 */
export class BasicContainer<TValue> implements ReadonlyContainer<string, TValue> {
    /** Identifies the package that owns this instance. */
    public readonly toolKind = "container";

    private readonly store: ItemStore<TValue>;

    /**
     * Creates a container, optionally seeded with values.
     *
     * @param initialValues Values copied into the new container.
     */
    public constructor(initialValues: Record<string, TValue> = {}) {
        this.store = new ItemStore<TValue>(Object.entries(initialValues));
    }

    /** Number of entries currently stored. */
    public get size(): number {
        return this.store.size;
    }

    /**
     * Stores `value` under `key`, replacing any previous value.
     *
     * @param key Key to write.
     * @param value Value to store.
     * @returns This container, to allow chaining.
     */
    public set(key: string, value: TValue): this {
        this.store.set(key, value);
        return this;
    }

    /**
     * Returns the value stored for `key`, or `undefined` when it is absent.
     *
     * @param key Key to look up.
     * @returns The stored value or `undefined`.
     */
    public get(key: string): TValue | undefined {
        return this.store.get(key);
    }

    /**
     * Returns the value stored for `key`.
     *
     * @param key Key to look up.
     * @returns The stored value.
     * @throws {Error} When the key is not present.
     */
    public getOrThrow(key: string): TValue {
        return this.store.getOrThrow(key);
    }

    /**
     * Reports whether `key` is stored.
     *
     * @param key Key to look up.
     * @returns `true` when the key is present.
     */
    public has(key: string): boolean {
        return this.store.has(key);
    }

    /**
     * Removes `key` from the container.
     *
     * @param key Key to remove.
     * @returns `true` when the key existed.
     */
    public delete(key: string): boolean {
        return this.store.delete(key);
    }

    /** Removes every entry. */
    public clear(): void {
        this.store.clear();
    }

    /**
     * Returns every stored key, in insertion order.
     *
     * @returns A new array with the keys.
     */
    public keys(): string[] {
        return this.store.keys();
    }

    /**
     * Returns every stored value, in insertion order.
     *
     * @returns A new array with the values.
     */
    public values(): TValue[] {
        return this.store.values();
    }

    /**
     * Returns every stored entry, in insertion order.
     *
     * @returns A new array of `[key, value]` pairs.
     */
    public entries(): Array<[string, TValue]> {
        return this.store.entries();
    }

    /**
     * Creates an independent copy of the container.
     *
     * The copy preserves the insertion order of the entries.
     *
     * @returns A new container with the same entries.
     */
    public clone(): BasicContainer<TValue> {
        const copy = new BasicContainer<TValue>();
        for (const [key, value] of this.store.entries()) {
            copy.store.set(key, value);
        }
        return copy;
    }

    /**
     * Returns the container contents as a plain object.
     *
     * The result is a copy: changing it does not affect the container.
     *
     * @returns A new record with the stored entries.
     */
    public toJSON(): Record<string, TValue> {
        return Object.fromEntries(this.store.entries());
    }
}
