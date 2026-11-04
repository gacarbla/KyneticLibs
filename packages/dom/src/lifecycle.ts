import { onCleanup } from "@kyneticweb/reactive";
import { isServerMode } from "./dom.js";

/**
 * Runs `fn` after the current component has been inserted into the DOM.
 *
 * The callback is skipped when the component is disposed before the microtask
 * runs, which is common with conditional rendering.
 *
 * @param fn Callback to run once.
 */
export function onMount(fn: () => void): void {
    if (isServerMode()) {
        return;
    }

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
