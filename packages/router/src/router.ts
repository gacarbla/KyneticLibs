import { createSignal, type Accessor } from "@kyneticweb/reactive";
import { buildPath, matchPath, normalizePath } from "./match.js";
import { createPathStrategy } from "./strategies.js";
import type {
    ExtractParams,
    Guard,
    NavigateArgs,
    NavigateOptions,
    RouteDefinitions,
    RouteMap,
    RouteParams,
    RoutePathMap,
    RouteState,
    Strategy,
} from "./types.js";

/** Options accepted by {@link createRouter}. */
export interface RouterOptions<D extends RouteDefinitions> {
    /** Route name → definition. Insertion order is the matching order. */
    readonly routes: D;
    /** URL strategy. Defaults to the History API. */
    readonly strategy?: Strategy;
    /** Route used when no path matches. */
    readonly fallback?: keyof D & string;
    /** Scroll to the top after navigation. Defaults to `true`. */
    readonly scroll?: boolean;
    /** Base path for the History API strategy. */
    readonly base?: string;
}

/** Public router instance. */
export interface Router<P extends RouteMap, D extends RouteDefinitions> {
    /** Route definitions, for `RouterView` and debugging. */
    readonly definitions: D;
    /** Current location, reactive. `null` when nothing matched. */
    readonly route: Accessor<RouteState<P> | null>;
    /** Active strategy. */
    readonly strategy: Strategy;
    /** Starts listening and resolves the initial route. */
    start(): () => void;
    /** Stops listening. */
    stop(): void;
    /** Navigates to a route, with typed params when the path has them. */
    navigate<K extends keyof P & string>(name: K, ...args: NavigateArgs<P[K]>): void;
    /** Builds the URL for a route. */
    href<K extends keyof P & string>(name: K, ...args: ExtractParamsFor<P[K]>): string;
    /** Registers a navigation guard. Returns the unsubscriber. */
    beforeEach(guard: Guard<P>): () => void;
    /** Goes back in history. */
    back(): void;
    /** Goes forward in history. */
    forward(): void;
}

/** Params tuple used by `href`. */
type ExtractParamsFor<Path extends string> = ExtractParams<Path> extends never ? [] : [params: RouteParams<Path>];

/** Reports whether a path template needs params. */
function needsParams(path: string): boolean {
    return /:[A-Za-z_][A-Za-z0-9_]*/.test(path);
}

/**
 * Creates a typed router.
 *
 * Routes are matched in insertion order, so put catch-all (`*`) routes last.
 *
 * @example
 * ```ts
 * const router = createRouter({
 *     routes: {
 *         home: { path: "/", component: () => <Home /> },
 *         user: { path: "/users/:id", component: () => <User /> },
 *     },
 *     fallback: "home",
 * });
 * router.start();
 * router.navigate("user", { id: "42" });
 * ```
 */
export function createRouter<const D extends RouteDefinitions>(options: RouterOptions<D>): Router<RoutePathMap<D>, D> {
    type P = RoutePathMap<D>;
    type State = RouteState<P>;

    const definitions = options.routes;
    const strategy = options.strategy ?? createPathStrategy(options.base);
    const route = createSignal<State | null>(null);
    const guards = new Set<Guard<P>>();
    const entries = Object.entries(definitions) as Array<[string, RouteDefinitions[string]]>;
    const shouldScroll = options.scroll ?? true;
    let stopListening: (() => void) | null = null;

    /** Finds the first definition matching a path. */
    const match = (path: string): State | null => {
        for (const [name, definition] of entries) {
            const params = matchPath(definition.path, path);
            if (params !== null) {
                return { name, params, path: normalizePath(path) } as State;
            }
        }
        return null;
    };

    /** Runs guards; returns the allowed target or `null`. */
    const guard = (to: State, from: State | null): State | null => {
        let current = to;
        for (let attempt = 0; attempt < 10; attempt += 1) {
            let redirected = false;
            for (const check of guards) {
                const result = check(current, from);
                if (result === false) {
                    return null;
                }
                if (typeof result === "string" && result !== current.name) {
                    const definition = definitions[result];
                    if (definition === undefined) {
                        throw new Error(`Guard redirected to unknown route "${result}".`);
                    }
                    if (needsParams(definition.path)) {
                        throw new Error(
                            `Guard redirected to "${result}", which needs params; redirect to a static route instead.`,
                        );
                    }
                    current = {
                        name: result,
                        params: {},
                        path: normalizePath(definition.path),
                    } as State;
                    redirected = true;
                    break;
                }
            }
            if (!redirected) {
                return current;
            }
        }
        throw new Error("Navigation guard redirect loop exceeded 10 steps.");
    };

    /** Applies a matched state without touching the strategy. */
    const apply = (state: State | null): void => {
        route.set(state);
        if (state !== null && shouldScroll && typeof window !== "undefined") {
            window.scrollTo({ top: 0 });
        }
    };

    /** Reads the current URL and updates the route. */
    const sync = (): void => {
        const path = strategy.read();
        const previous = route();
        if (previous !== null && previous.path === normalizePath(path)) {
            return;
        }
        const state = match(path);
        if (state !== null) {
            const allowed = guard(state, previous);
            if (allowed === null) {
                return;
            }
            if (allowed !== state) {
                strategy.replace(allowed.path);
                apply(allowed);
                return;
            }
            apply(allowed);
            return;
        }
        if (options.fallback !== undefined) {
            const definition = definitions[options.fallback];
            if (definition !== undefined && !needsParams(definition.path)) {
                const path = normalizePath(definition.path);
                strategy.replace(path);
                apply({
                    name: options.fallback,
                    params: {},
                    path,
                } as State);
                return;
            }
        }
        apply(null);
    };

    /** Navigates with already-normalized arguments. */
    const go = (
        name: string,
        params: Record<string, string> | undefined,
        navOptions: NavigateOptions | undefined,
    ): void => {
        const definition = definitions[name];
        if (definition === undefined) {
            throw new Error(`Unknown route "${name}".`);
        }

        const path = buildPath(definition.path, params);
        const target = {
            name,
            params: (params ?? {}) as RouteParams<string>,
            path,
        } as State;
        const allowed = guard(target, route());
        if (allowed === null) {
            return;
        }

        if (navOptions?.replace === true) {
            strategy.replace(allowed.path, navOptions?.state);
        } else {
            strategy.push(allowed.path, navOptions?.state);
        }
        apply(allowed);
    };

    const navigate = ((name: string, ...args: unknown[]) => {
        const definition = definitions[name];
        if (definition === undefined) {
            throw new Error(`Unknown route "${name}".`);
        }
        if (needsParams(definition.path)) {
            go(name, args[0] as Record<string, string> | undefined, args[1] as NavigateOptions | undefined);
            return;
        }
        go(name, undefined, args[0] as NavigateOptions | undefined);
    }) as Router<P, D>["navigate"];

    const href = ((name: string, ...args: unknown[]) => {
        const definition = definitions[name];
        if (definition === undefined) {
            throw new Error(`Unknown route "${name}".`);
        }
        return buildPath(definition.path, (args[0] as Record<string, string> | undefined) ?? {});
    }) as Router<P, D>["href"];

    const stop = (): void => {
        stopListening?.();
        stopListening = null;
    };

    const router: Router<P, D> = {
        definitions,
        route,
        strategy,
        start() {
            stop();
            stopListening = strategy.subscribe(sync);
            sync();
            return stop;
        },
        stop,
        navigate,
        href,
        beforeEach(check) {
            guards.add(check);
            return () => {
                guards.delete(check);
            };
        },
        back() {
            if (typeof window !== "undefined") {
                window.history.back();
            }
        },
        forward() {
            if (typeof window !== "undefined") {
                window.history.forward();
            }
        },
    };

    return router;
}
