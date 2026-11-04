/**
 * Internal storage shared by the container implementations.
 *
 * This module is not re-exported from the package index, so `ItemStore` and
 * `readEntries` never become part of the public API.
 *
 * @packageDocumentation
 */

/**
 * Internal `Map` wrapper that centralises container bookkeeping.
 *
 * Each public container composes one store and only adds its own typing rules,
 * which keeps the three implementations small and consistent.
 */
export class ItemStore<TValue> {
    private readonly items: Map<string, TValue>;

    /**
     * Creates a store, optionally seeded with entries.
     *
     * @param entries Entries copied into the new store.
     */
    public constructor(entries?: Iterable<readonly [string, TValue]>) {
        this.items = new Map(entries);
    }

    /** Number of entries currently stored. */
    public get size(): number {
        return this.items.size;
    }

    /**
     * Stores `value` under `key`, replacing any previous value.
     *
     * @param key Key to write.
     * @param value Value to store.
     */
    public set(key: string, value: TValue): void {
        this.items.set(key, value);
    }

    /**
     * Returns the value stored for `key`, or `undefined` when it is absent.
     *
     * @param key Key to look up.
     * @returns The stored value or `undefined`.
     */
    public get(key: string): TValue | undefined {
        return this.items.get(key);
    }

    /**
     * Returns the value stored for `key`.
     *
     * `undefined` is treated as absent: containers never distinguish "not
     * declared" from "declared without a value".
     *
     * @param key Key to look up.
     * @returns The stored value.
     * @throws {Error} When the key has no value.
     */
    public getOrThrow(key: string): TValue {
        const value = this.items.get(key);
        if (value === undefined) {
            throw new Error(`The container has no value stored for the key "${key}".`);
        }
        return value;
    }

    /**
     * Reports whether `key` is stored.
     *
     * @param key Key to look up.
     * @returns `true` when the key is present.
     */
    public has(key: string): boolean {
        return this.items.has(key);
    }

    /**
     * Removes `key` from the store.
     *
     * @param key Key to remove.
     * @returns `true` when the key existed.
     */
    public delete(key: string): boolean {
        return this.items.delete(key);
    }

    /** Removes every entry. */
    public clear(): void {
        this.items.clear();
    }

    /**
     * Returns every stored key, in insertion order.
     *
     * @returns A new array with the keys.
     */
    public keys(): string[] {
        return [...this.items.keys()];
    }

    /**
     * Returns every stored value, in insertion order.
     *
     * @returns A new array with the values.
     */
    public values(): TValue[] {
        return [...this.items.values()];
    }

    /**
     * Returns every stored entry, in insertion order.
     *
     * @returns A new array of `[key, value]` pairs.
     */
    public entries(): Array<[string, TValue]> {
        return [...this.items.entries()];
    }

    /**
     * Creates an independent copy of the store.
     *
     * @returns A new store with the same entries.
     */
    public clone(): ItemStore<TValue> {
        return new ItemStore<TValue>(this.items);
    }
}

/**
 * Reads the own enumerable properties of an object as untyped entries.
 *
 * Containers use it to seed their store from a `Partial<K>` without having to
 * index a generic mapped type.
 *
 * @param source Object to read.
 * @returns A new array of `[key, value]` pairs.
 */
export function readEntries(source: object): Array<[string, unknown]> {
    const entries: Array<[string, unknown]> = Object.entries(source);
    return entries;
}
