/**
 * Waits for the reactive scheduler.
 *
 * Effects are flushed in a microtask, so two turns cover the common case where
 * an effect schedules another one.
 */
export async function flush(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
}
