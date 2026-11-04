import { onCleanup } from "@kyneticweb/reactive";
import { isServerRendering } from "./dom.js";

/**
 * Runs `fn` after the current component has been inserted into the DOM.
 *
 * The callback is skipped during server rendering and runs after hydration,
 * which is when the adopted nodes are ready.
 *
 * @param fn Callback to run once.
 */
export function onMount(fn: () => void): void {
    if (isServerRendering()) {
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
