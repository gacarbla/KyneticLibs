import type { Child } from "./types.js";

/**
 * Resolves nested child thunks until a concrete value is reached.
 *
 * The compiler turns dynamic expressions into thunks; components may also
 * receive children as thunks. This helper is the single place that decides
 * when a child is still lazy and when it is a value.
 *
 * @param child Child value, thunk or nested list.
 * @returns The resolved child (arrays may still contain thunks).
 */
export function resolveChild(child: Child): Child {
    let value = child;
    let depth = 0;

    while (typeof value === "function") {
        if (depth++ > 100) {
            throw new Error("Child resolution exceeded 100 nested thunks.");
        }
        value = value();
    }

    return value;
}
