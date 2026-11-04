import { ItemStore, readEntries } from "./item-store.js";
import type { ReadonlyContainer } from "./readonly-container.js";
import type { DynamicKeyTypes } from "./types.js";

/**
 * Container whose key shape grows over time without losing type safety.
 *
 * `addKey` and `withValue` are immutable: they return a new container whose
 * type includes the new key, leaving the original untouched.
 *
 * @typeParam K Record describing the keys declared so far.
 *
 * @example
 * ```ts
 * const base = new DynamicContainer();
 * const counted = base.withValue("count", 3);
 * counted.getOrThrow("count"); // 3 (typed as number)
 * base.has("count"); // false: the original is unchanged
 * ```
 */
// `Record<never, never>` is the documented default for a container with no keys.
export class DynamicContainer<K extends DynamicKeyTypes = Record<never, never>> implements ReadonlyContainer<
    keyof K & string,
    K[keyof K]
> {
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
     * Returns a new container whose type declares `key`.
     *
     * The key is registered with an `undefined` value, so the copy reports it
     * through {@link has} until a real value is assigned. The current
     * container is not modified.
     *
     * @typeParam Key New key name.
     * @typeParam TValue Value type associated with the key.
     * @param key Key to declare.
     * @returns A new, independent container with the extra key.
     *
     * @example
     * ```ts
     * const empty = new DynamicContainer();
     * const withCount = empty.addKey<"count", number>("count");
     * ```
     */
    public addKey<Key extends string, TValue>(key: Key): DynamicContainer<K & Record<Key, TValue>> {
        const next = this.copy<K & Record<Key, TValue>>();
        if (!next.store.has(key)) {
            next.store.set(key, undefined);
        }
        return next;
    }

    /**
     * Returns a new container that declares `key` with an initial value.
     *
     * @typeParam Key New key name.
     * @typeParam TValue Value type associated with the key.
     * @param key Key to write.
     * @param value Initial value for the key.
     * @returns A new, independent container with the key and value.
     *
     * @example
     * ```ts
     * const base = new DynamicContainer();
     * const counted = base.withValue("count", 3);
     * ```
     */
    public withValue<Key extends string, TValue>(key: Key, value: TValue): DynamicContainer<K & Record<Key, TValue>> {
        const next = this.addKey<Key, TValue>(key);
        next.store.set(key, value);
        return next;
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
     * @returns A new container with the same entries and key type.
     */
    public clone(): DynamicContainer<K> {
        const copy = new DynamicContainer<K>();
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

    /**
     * Copies the store into a new container with the given key type.
     *
     * @typeParam Next Key shape of the copy.
     * @returns A new container with the same entries.
     */
    private copy<Next extends DynamicKeyTypes>(): DynamicContainer<Next> {
        const copy = new DynamicContainer<Next>();
        for (const [key, value] of this.store.entries()) {
            copy.store.set(key, value);
        }
        return copy;
    }

    /** Reads the store as entries typed by the container shape. */
    private typedEntries(): Array<[keyof K & string, K[keyof K]]> {
        // The store only receives keys declared in K, which TypeScript cannot
        // express for a runtime map keyed by `string`.
        return this.store.entries() as Array<[keyof K & string, K[keyof K]]>;
    }
}
