/**
 * Public types of the reactive core.
 *
 * The API is callable on purpose: a signal is read with `count()` and written
 * with `count.set(...)`, which keeps components readable and gives the compiler
 * a single, explicit dependency to track.
 */

/** Read-only accessor for a reactive value. */
export type Accessor<T> = () => T;

/** Writes a value or derives it from the previous one. */
export type Setter<T> = (value: T | ((previous: T) => T)) => T;

/**
 * Observable value.
 *
 * @example
 * ```ts
 * const count = createSignal(0);
 * count();          // 0
 * count.set(1);     // 1
 * count.update(n => n + 1); // 2
 * ```
 */
export interface Signal<T> extends Accessor<T> {
    /** Writes a new value, or derives it from the previous one. */
    set: Setter<T>;
    /** Derives the next value from the previous one. */
    update(derive: (previous: T) => T): T;
    /** Reads the value without subscribing the running observer. */
    peek(): T;
}

/**
 * A cached value derived from other reactive values.
 *
 * The accessor is lazy: it recomputes only when read after one of its
 * dependencies changed.
 */
export interface Computed<T> extends Accessor<T> {
    /** Reads the cached value without subscribing the running observer. */
    peek(): T;
    /** Stops tracking dependencies and releases observers. */
    dispose(): void;
}

/** Options accepted by {@link createSignal}. */
export interface SignalOptions<T> {
    /** Equality used to decide whether a write must notify. Defaults to `Object.is`. */
    equals?: (previous: T, next: T) => boolean;
}

/** Cancels an effect or a root. */
export type Dispose = () => void;
