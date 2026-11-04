/**
 * Read-only contract implemented by every container.
 *
 * @packageDocumentation
 */

/**
 * Read-only view of a key/value container.
 *
 * Consumers can depend on this interface when they only need to read values,
 * which keeps write access out of their API surface.
 *
 * @typeParam TKey Key type accepted by the container.
 * @typeParam TValue Value type stored by the container.
 *
 * @example
 * ```ts
 * function printSize(container: ReadonlyContainer<string, number>): void {
 *     console.log(container.size);
 * }
 * ```
 */
export interface ReadonlyContainer<TKey extends PropertyKey, TValue> {
    /** Number of entries currently stored. */
    readonly size: number;

    /**
     * Returns the value stored for `key`, or `undefined` when it is absent.
     *
     * @param key Key to look up.
     * @returns The stored value or `undefined`.
     */
    get(key: TKey): TValue | undefined;

    /**
     * Returns the value stored for `key`.
     *
     * @param key Key to look up.
     * @returns The stored value.
     * @throws {Error} When the key is not present.
     */
    getOrThrow(key: TKey): TValue;

    /**
     * Reports whether `key` is stored.
     *
     * @param key Key to look up.
     * @returns `true` when the key is present.
     */
    has(key: TKey): boolean;

    /**
     * Returns every stored key, in insertion order.
     *
     * @returns A new array with the keys.
     */
    keys(): TKey[];

    /**
     * Returns every stored value, in insertion order.
     *
     * @returns A new array with the values.
     */
    values(): TValue[];

    /**
     * Returns every stored entry, in insertion order.
     *
     * @returns A new array of `[key, value]` pairs.
     */
    entries(): Array<[TKey, TValue]>;
}
