import type { WaitForOptions } from "./types.js";

/**
 * Retries `callback` until it returns a value other than `false`, `null` or
 * `undefined`.
 *
 * @param callback Condition or query to retry.
 * @param options Timeout and polling interval.
 * @returns The first truthy result.
 * @throws {Error} When the timeout expires.
 *
 * @example
 * ```ts
 * await waitFor(() => app.queryByText("Saved"));
 * ```
 */
export async function waitFor<T>(callback: () => T | Promise<T>, options: WaitForOptions = {}): Promise<T> {
    const timeout = options.timeout ?? 1000;
    const interval = options.interval ?? 10;
    const deadline = Date.now() + timeout;
    let lastError: unknown;

    for (;;) {
        try {
            const value = await callback();
            if (value !== false && value !== null && value !== undefined) {
                return value;
            }
        } catch (error) {
            lastError = error;
        }

        if (Date.now() >= deadline) {
            throw lastError instanceof Error ? lastError : new Error(`waitFor timed out after ${timeout} ms.`);
        }
        await new Promise((resolve) => setTimeout(resolve, interval));
    }
}
