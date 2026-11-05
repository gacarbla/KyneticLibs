/**
 * Compatibility setup for the Vitest process.
 *
 * Vitest 5 uses `Map.groupBy` in its default reporter. That method exists in
 * Node 21+, but the project still supports Node 20, where a failing test would
 * crash the reporter and hide the real error. The polyfill keeps failure
 * output readable on Node 20; it does nothing on newer versions.
 */
if (typeof Map.groupBy !== "function") {
    Object.defineProperty(Map, "groupBy", {
        configurable: true,
        writable: true,
        value(items, callback) {
            const result = new Map();
            let index = 0;
            for (const item of items) {
                const key = callback(item, index++);
                const bucket = result.get(key);
                if (bucket === undefined) {
                    result.set(key, [item]);
                } else {
                    bucket.push(item);
                }
            }
            return result;
        },
    });
}

/** Vitest global setup entry point. */
export default function globalSetup() {}
