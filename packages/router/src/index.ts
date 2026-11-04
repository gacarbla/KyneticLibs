/**
 * `@kyneticweb/router`
 *
 * Typed routing for the Kynetic DOM runtime.
 */

export { createRouter, type Router, type RouterOptions } from "./router.js";
export { buildPath, matchPath, normalizePath } from "./match.js";
export { createHashStrategy, createMemoryStrategy, createPathStrategy } from "./strategies.js";
export { Link, RouterProvider, RouterView, useRoute, useRouter } from "./components.js";
export type { LinkProps, RouterProviderProps, RouterViewProps } from "./components.js";
export type {
    ExtractParams,
    Guard,
    GuardResult,
    NavigateArgs,
    NavigateOptions,
    RouteDefinition,
    RouteDefinitions,
    RouteMap,
    RouteParams,
    RoutePathMap,
    RouteState,
    Strategy,
} from "./types.js";
