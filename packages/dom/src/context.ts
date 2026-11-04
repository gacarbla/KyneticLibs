import {
    createOwner,
    disposeOwner,
    getOwner,
    getScopedValue,
    onCleanup,
    runWithOwner,
    setScopedValue,
} from "@kyneticweb/reactive";
import { resolveChild } from "./child.js";
import { isServerRendering } from "./dom.js";
import { linkOwner } from "./devtools.js";
import type { Child } from "./types.js";

/**
 * Context definition with a synchronous provider.
 *
 * Context values are read during component setup, so `useContext` must be
 * called in the component body, not inside a later effect. Passing an accessor
 * as `value` keeps the context reactive.
 *
 * The provider also attaches the value to an owner scope, which is what keeps
 * context available for effects and components created later (lazy routes,
 * deferred views, list rows).
 *
 * @example
 * ```tsx
 * const Theme = createContext("light");
 *
 * function Panel() {
 *     const theme = useContext(Theme);
 *     return <div class={theme}>...</div>;
 * }
 *
 * <Theme.Provider value="dark"><Panel /></Theme.Provider>;
 * ```
 */
export class Context<T> {
    readonly #stack: T[] = [];

    /**
     * @param defaultValue Value returned when no provider is active.
     */
    public constructor(public readonly defaultValue: T) {}

    /**
     * Provider component. Children resolve while the value is on the stack
     * (server rendering) or inside a dedicated owner scope (client and
     * hydration).
     */
    public readonly Provider = (props: { value: T; children?: Child }): Child => {
        if (isServerRendering()) {
            return {
                kind: "provider",
                context: this,
                value: props.value,
                children: props.children,
            } as unknown as Child;
        }

        const parent = getOwner();
        const scope = createOwner();
        linkOwner(scope, parent);
        onCleanup(() => disposeOwner(scope));
        return runWithOwner(scope, () => {
            // Wrapped so an `undefined` provider value is distinguishable from
            // "no provider in the owner chain".
            setScopedValue(this, { value: props.value });
            return resolveChild(props.children);
        });
    };

    /** Runs `render` with `value` on the stack. */
    public runWith<R>(value: T, render: () => R): R {
        this.#stack.push(value);
        try {
            return render();
        } finally {
            this.#stack.pop();
        }
    }

    /** Reads the active value or the default one. */
    public read(): T {
        const scoped = getScopedValue(this) as { value: T } | undefined;
        if (scoped !== undefined) {
            return scoped.value;
        }
        const current = this.#stack[this.#stack.length - 1];
        return current === undefined ? this.defaultValue : current;
    }
}

/**
 * Creates a context with a default value.
 *
 * @param defaultValue Value used outside any provider.
 */
export function createContext<T>(defaultValue: T): Context<T> {
    return new Context(defaultValue);
}

/**
 * Reads the nearest provider value for `context`.
 *
 * @param context Context created with {@link createContext}.
 */
export function useContext<T>(context: Context<T>): T {
    return context.read();
}
