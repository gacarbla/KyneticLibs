import { describe, expect, it } from "vitest";
import { Counter } from "../src/index.js";

describe("Counter", () => {
    it("starts at zero by default", () => {
        expect(new Counter().value).toBe(0);
    });

    it("starts at the given initial value", () => {
        expect(new Counter(10).value).toBe(10);
    });

    it("increments by one by default", () => {
        const counter = new Counter();

        expect(counter.increment()).toBe(counter);
        expect(counter.value).toBe(1);
    });

    it("increments by a custom step", () => {
        const counter = new Counter(10);

        counter.increment(5);

        expect(counter.value).toBe(15);
    });

    it("decrements by one by default", () => {
        const counter = new Counter();

        expect(counter.decrement()).toBe(counter);
        expect(counter.value).toBe(-1);
    });

    it("decrements by a custom step", () => {
        const counter = new Counter(10);

        counter.decrement(4);

        expect(counter.value).toBe(6);
    });

    it("sets an exact value", () => {
        const counter = new Counter(1);

        expect(counter.set(42)).toBe(counter);
        expect(counter.value).toBe(42);
    });

    it("resets to the initial value", () => {
        const counter = new Counter(10);
        counter.increment(5).decrement(2);

        expect(counter.reset()).toBe(counter);
        expect(counter.value).toBe(10);
    });

    it("resets to zero when no initial value was given", () => {
        const counter = new Counter();
        counter.increment(7);

        counter.reset();

        expect(counter.value).toBe(0);
    });

    it("prints its value", () => {
        expect(new Counter(7).toString()).toBe("7");
        expect(new Counter(-2.5).toString()).toBe("-2.5");
    });

    it("keeps the deprecated next and previous getters working", () => {
        const counter = new Counter(10);

        expect(counter.next).toBe(11);
        expect(counter.next).toBe(12);
        expect(counter.previous).toBe(11);
        expect(counter.value).toBe(11);
    });

    it("rejects a non-finite initial value", () => {
        expect(() => new Counter(Number.NaN)).toThrowError(
            new RangeError("The counter initial value must be a finite number, received NaN."),
        );
        expect(() => new Counter(Number.POSITIVE_INFINITY)).toThrowError(RangeError);
        expect(() => new Counter(Number.NEGATIVE_INFINITY)).toThrowError(RangeError);
    });

    it("rejects non-finite steps without changing the value", () => {
        const counter = new Counter(3);

        expect(() => counter.increment(Number.NaN)).toThrowError(
            new RangeError("The counter increment step must be a finite number, received NaN."),
        );
        expect(() => counter.decrement(Number.POSITIVE_INFINITY)).toThrowError(
            new RangeError("The counter decrement step must be a finite number, received Infinity."),
        );
        expect(counter.value).toBe(3);
    });

    it("rejects a non-finite value in set", () => {
        const counter = new Counter(3);

        expect(() => counter.set(Number.NEGATIVE_INFINITY)).toThrowError(
            new RangeError("The counter value must be a finite number, received -Infinity."),
        );
        expect(counter.value).toBe(3);
    });

    it("rejects results that overflow", () => {
        const counter = new Counter(Number.MAX_VALUE);

        expect(() => counter.increment(Number.MAX_VALUE)).toThrowError(RangeError);
        expect(counter.value).toBe(Number.MAX_VALUE);
    });

    it("identifies its package", () => {
        expect(new Counter().toolKind).toBe("counter");
    });
});
