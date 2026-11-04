import { ItemStore, readEntries } from "./item-store.js";
import type { ReadonlyContainer } from "./readonly-container.js";
import type { KeyMap } from "./types.js";

/**
 * Container that keeps a different value type for each declared key.
 *
 * The shape is fixed by the `K` type argument, so the compiler checks every
 * key/value pair and autocompletion lists the available keys.
 *
 * @typeParam K Record describing every allowed key and its value type.
 *
 * @example
 * ```ts
 * type Settings = { theme: string; compact: boolean };
 * const settings = new StrictContainer<Settings>({ theme: "dark" });
 * settings.set("compact", true);
 * settings.getOrThrow("theme"); // "dark"
 * ```
 */
export class StrictContainer<K extends KeyMap> implements ReadonlyContainer<keyof K & string, K[keyof K]> {
    /** Identifies the package that owns this instance. */
    public readonly toolKind = "container";

    private readonly store: ItemStore<unknown>;

    /**
     * Creates a container, optionally seeded with values.
     *
     * @param initialValues Values copied into the new container.
     */
    public constructor(initialValues: Partial<K> = {}) {
        this.store = new ItemStore<unknown>(readEntries(initialValues));
    }

    /** Number of entries currently stored. */
    public get size(): number {
        return this.store.size;
    }

    /**
     * Stores `value` under `key`, replacing any previous value.
     *
     * @typeParam Key Key being written.
     * @param key Key to write.
     * @param value Value matching the key type.
     * @returns This container, to allow chaining.
     */
    public set<Key extends keyof K & string>(key: Key, value: K[Key]): this {
        this.store.set(key, value);
        return this;
    }

    /**
     * Returns the value stored for `key`, or `undefined` when it is absent.
     *
     * @typeParam Key Key being read.
     * @param key Key to look up.
     * @returns The stored value or `undefined`.
     */
    public get<Key extends keyof K & string>(key: Key): K[Key] | undefined {
        // The store is untyped because keys hold different value types. The
        // generic signature below is the only way to write a key, so reading
        // it back with the same key type preserves that invariant.
        return this.store.get(key) as K[Key] | undefined;
    }

    /**
     * Returns the value stored for `key`.
     *
     * @typeParam Key Key being read.
     * @param key Key to look up.
     * @returns The stored value.
     * @throws {Error} When the key is not present.
     */
    public getOrThrow<Key extends keyof K & string>(key: Key): K[Key] {
        // Same reasoning as `get`: values only enter the store through `set`.
        return this.store.getOrThrow(key) as K[Key];
    }

    /**
     * Reports whether `key` is stored.
     *
     * @typeParam Key Key being checked.
     * @param key Key to look up.
     * @returns `true` when the key is present.
     */
    public has<Key extends keyof K & string>(key: Key): boolean {
        return this.store.has(key);
    }

    /**
     * Removes `key` from the container.
     *
     * @typeParam Key Key being removed.
     * @param key Key to remove.
     * @returns `true` when the key existed.
     */
    public delete<Key extends keyof K & string>(key: Key): boolean {
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
    public keys(): Array<keyof K & string> {
        return this.typedEntries().map(([key]) => key);
    }

    /**
     * Returns every stored value, in insertion order.
     *
     * @returns A new array with the values.
     */
    public values(): Array<K[keyof K]> {
        return this.typedEntries().map(([, value]) => value);
    }

    /**
     * Returns every stored entry, in insertion order.
     *
     * @returns A new array of `[key, value]` pairs.
     */
    public entries(): Array<[keyof K & string, K[keyof K]]> {
        return this.typedEntries();
    }

    /**
     * Creates an independent copy of the container.
     *
     * The copy preserves the insertion order of the entries.
     *
     * @returns A new container with the same entries.
     */
    public clone(): StrictContainer<K> {
        const copy = new StrictContainer<K>();
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
     * @returns A new partial record with the stored entries.
     */
    public toJSON(): Partial<K> {
        // `Partial<K>` is a generic mapped type and cannot be produced directly
        // from a runtime map. Every entry came from `set`, so the shape holds.
        return Object.fromEntries(this.store.entries()) as Partial<K>;
    }

    /** Reads the store as entries typed by the container shape. */
    private typedEntries(): Array<[keyof K & string, K[keyof K]]> {
        // The store only receives keys declared in K, which TypeScript cannot
        // express for a runtime map keyed by `string`.
        return this.store.entries() as Array<[keyof K & string, K[keyof K]]>;
    }
}
