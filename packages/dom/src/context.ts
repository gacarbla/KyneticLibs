import { resolveChild } from "./child.js";
import type { Child } from "./types.js";

/**
 * Context definition with a synchronous provider.
 *
 * Context values are read during component setup, so `useContext` must be
 * called in the component body, not inside a later effect. Passing an accessor
 * as `value` keeps the context reactive.
 *
 * @example
 * ```ts
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
     * Provider component. Children are resolved while the value is on the
     * stack, so nested components read it synchronously.
     */
    public readonly Provider = (props: { value: T; children?: Child }): Child => {
        this.#stack.push(props.value);
        try {
            return resolveChild(props.children);
        } finally {
            this.#stack.pop();
        }
    };

    /** Reads the active value or the default one. */
    public read(): T {
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
