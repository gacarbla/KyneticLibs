/**
 * A small, predictable counter.
 *
 * Every operation validates its input and returns the instance, so calls can
 * be chained. The initial value is remembered and restored by {@link Counter.reset}.
 */

/** Validates that a counter value is a finite number. */
function assertFinite(value: number, label: string): void {
    if (!Number.isFinite(value)) {
        throw new RangeError(`The counter ${label} must be a finite number, received ${String(value)}.`);
    }
}

/**
 * Mutable counter with explicit increment, decrement and reset operations.
 *
 * @example
 * ```ts
 * const counter = new Counter(10);
 * counter.increment(5).decrement(2);
 * counter.value; // 13
 * counter.reset().value; // 10
 * ```
 */
export class Counter {
    /** Identifies the package that owns this instance. */
    public readonly toolKind = "counter";

    private readonly initialValue: number;
    private currentValue: number;

    /**
     * Creates a counter.
     *
     * @param initialValue Starting value, and the value restored by `reset`. Defaults to `0`.
     * @throws {RangeError} When `initialValue` is not finite.
     */
    public constructor(initialValue: number = 0) {
        assertFinite(initialValue, "initial value");
        this.initialValue = initialValue;
        this.currentValue = initialValue;
    }

    /** Current value. */
    public get value(): number {
        return this.currentValue;
    }

    /**
     * Adds `step` to the current value.
     *
     * @param step Amount to add. Defaults to `1`.
     * @returns This counter, to allow chaining.
     * @throws {RangeError} When `step` or the resulting value is not finite.
     */
    public increment(step: number = 1): this {
        return this.applyStep(step, "increment step", 1);
    }

    /**
     * Subtracts `step` from the current value.
     *
     * @param step Amount to subtract. Defaults to `1`.
     * @returns This counter, to allow chaining.
     * @throws {RangeError} When `step` or the resulting value is not finite.
     */
    public decrement(step: number = 1): this {
        return this.applyStep(step, "decrement step", -1);
    }

    /**
     * Replaces the current value.
     *
     * @param value New value.
     * @returns This counter, to allow chaining.
     * @throws {RangeError} When `value` is not finite.
     */
    public set(value: number): this {
        assertFinite(value, "value");
        this.currentValue = value;
        return this;
    }

    /**
     * Restores the value passed to the constructor.
     *
     * @returns This counter, to allow chaining.
     */
    public reset(): this {
        this.currentValue = this.initialValue;
        return this;
    }

    /**
     * Returns the current value as text.
     *
     * @returns The current value converted with `String`.
     */
    public toString(): string {
        return String(this.currentValue);
    }

    /**
     * Increments the counter and returns the new value.
     *
     * @deprecated Use {@link increment} instead.
     * @returns The value after incrementing.
     */
    public get next(): number {
        return this.increment().value;
    }

    /**
     * Decrements the counter and returns the new value.
     *
     * @deprecated Use {@link decrement} instead.
     * @returns The value after decrementing.
     */
    public get previous(): number {
        return this.decrement().value;
    }

    /**
     * Applies a signed step after validating it.
     *
     * @param step Amount to add or subtract.
     * @param label Name of the operation, used in error messages.
     * @param sign `1` to add, `-1` to subtract.
     * @returns This counter, to allow chaining.
     */
    private applyStep(step: number, label: string, sign: 1 | -1): this {
        assertFinite(step, label);
        return this.set(this.currentValue + sign * step);
    }
}
