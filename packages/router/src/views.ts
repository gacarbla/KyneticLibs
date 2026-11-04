import type { Child } from "@kyneticweb/dom";

/** Lazy view factory as declared by a route definition. */
export type LazyView = () => Promise<{ readonly default: () => Child }>;

/** Views that already resolved, so a later render stays synchronous. */
const RESOLVED_VIEWS = new WeakMap<LazyView, () => Child>();

/** In-flight loads, so repeated renders never import the same module twice. */
const LOADING_VIEWS = new WeakMap<LazyView, Promise<() => Child>>();

/**
 * Loads one lazy view and caches its component.
 *
 * @param load Route loader.
 * @returns The view factory once the module is available.
 */
export function loadView(load: LazyView): Promise<() => Child> {
    const resolved = RESOLVED_VIEWS.get(load);
    if (resolved !== undefined) {
        return Promise.resolve(resolved);
    }
    let promise = LOADING_VIEWS.get(load);
    if (promise === undefined) {
        promise = load().then((module) => {
            RESOLVED_VIEWS.set(load, module.default);
            return module.default;
        });
        LOADING_VIEWS.set(load, promise);
    }
    return promise;
}

/**
 * Returns the view if it already loaded.
 *
 * @param load Route loader.
 * @returns The cached factory, or `undefined`.
 */
export function cachedView(load: LazyView): (() => Child) | undefined {
    return RESOLVED_VIEWS.get(load);
}
