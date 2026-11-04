import { onCleanup } from "@kyneticweb/reactive";

/**
 * Runs `fn` after the current component has been inserted into the DOM.
 *
 * The callback is skipped when the component is disposed before the microtask
 * runs, which is common with conditional rendering.
 *
 * @param fn Callback to run once.
 */
export function onMount(fn: () => void): void {
    let disposed = false;
    onCleanup(() => {
        disposed = true;
    });
    queueMicrotask(() => {
        if (!disposed) {
            fn();
        }
    });
}
