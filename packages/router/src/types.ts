import type { Child } from "@kyneticweb/dom";

/** Route name → path template. */
export type RouteMap = Record<string, string>;

/** Extracts `:param` names from a path template. */
export type ExtractParams<Path extends string> = Path extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractParams<Rest>
    : Path extends `${string}:${infer Param}`
      ? Param
      : never;

/** Params required by a path template. */
export type RouteParams<Path extends string> = { [Key in ExtractParams<Path>]: string };

/** Definition of one route. */
export interface RouteDefinition {
    /** Path template, for example `/users/:id`. */
    readonly path: string;
    /** Eager view factory. */
    readonly component?: () => Child;
    /** Lazy view factory; the module must export a default component. */
    readonly load?: () => Promise<{ readonly default: () => Child }>;
}

/** Route name → definition. */
export type RouteDefinitions = Record<string, RouteDefinition>;

/** Route name → path template, inferred from the definitions. */
export type RoutePathMap<D extends RouteDefinitions> = { [K in keyof D & string]: D[K]["path"] };

/** Current location, discriminated by route name. */
export type RouteState<P extends RouteMap> = {
    [K in keyof P & string]: {
        readonly name: K;
        readonly params: RouteParams<P[K]>;
        readonly path: string;
    };
}[keyof P & string];

/** Navigation options. */
export interface NavigateOptions {
    /** Replace the current history entry instead of pushing one. */
    readonly replace?: boolean;
    /** Arbitrary state stored in the history entry. */
    readonly state?: unknown;
}

/** Arguments accepted by `navigate` for a route with or without params. */
export type NavigateArgs<Path extends string> =
    ExtractParams<Path> extends never
        ? [options?: NavigateOptions]
        : [params: RouteParams<Path>, options?: NavigateOptions];

/** Guard result: `false` cancels, a route name redirects, anything else allows. */
export type GuardResult = boolean | string | void;

/** Navigation guard. */
export type Guard<P extends RouteMap> = (to: RouteState<P>, from: RouteState<P> | null) => GuardResult;

/** URL strategy contract. */
export interface Strategy {
    readonly kind: "path" | "hash" | "memory";
    /** Current path, always starting with `/`. */
    read(): string;
    /** Pushes a new entry. */
    push(path: string, state?: unknown): void;
    /** Replaces the current entry. */
    replace(path: string, state?: unknown): void;
    /** Subscribes to external changes (popstate, hashchange). */
    subscribe(listener: () => void): () => void;
}
