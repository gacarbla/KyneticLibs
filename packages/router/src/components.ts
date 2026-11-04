import { createContext, createEffect, createSignal, jsx, onCleanup, useContext, type Child } from "@kyneticweb/dom";
import type { Router } from "./router.js";
import type { NavigateOptions, RouteDefinitions, RouteMap } from "./types.js";

/** Internal context that carries the active router. */
const RouterContext = createContext<Router<RouteMap, RouteDefinitions> | null>(null);

/** Props accepted by {@link RouterProvider}. */
export interface RouterProviderProps<P extends RouteMap = RouteMap, D extends RouteDefinitions = RouteDefinitions> {
    readonly router: Router<P, D>;
    readonly children?: Child;
}

/**
 * Makes a router available to {@link RouterView}, {@link Link}, `useRouter`
 * and `useRoute`.
 */
export function RouterProvider<P extends RouteMap, D extends RouteDefinitions>(
    props: RouterProviderProps<P, D>,
): Child {
    return jsx(
        RouterContext.Provider,
        { value: props.router as unknown as Router<RouteMap, RouteDefinitions> },
        props.children,
    );
}

/**
 * Returns the active router.
 *
 * @throws {Error} When called outside a `RouterProvider`.
 */
export function useRouter<P extends RouteMap = RouteMap, D extends RouteDefinitions = RouteDefinitions>(): Router<
    P,
    D
> {
    const router = useContext(RouterContext);
    if (router === null) {
        throw new Error("useRouter must be used inside <RouterProvider>.");
    }
    return router as unknown as Router<P, D>;
}

/** Returns the reactive current route. */
export function useRoute<P extends RouteMap = RouteMap, D extends RouteDefinitions = RouteDefinitions>() {
    return useRouter<P, D>().route;
}

/** Props accepted by {@link RouterView}. */
export interface RouterViewProps {
    /** Rendered when no route matches or the route has no view. */
    readonly fallback?: Child;
    /** Rendered while a lazy route loads. */
    readonly loading?: Child;
}

/**
 * Renders the view of the current route.
 *
 * Lazy routes are loaded once per navigation; a cancelled navigation never
 * commits its view.
 */
export function RouterView(props: RouterViewProps = {}): Child {
    const router = useRouter();
    const view = createSignal<Child>(props.fallback ?? null);

    createEffect(() => {
        const current = router.route();
        if (current === null) {
            view.set(props.fallback ?? null);
            return;
        }

        const definition = router.definitions[current.name as string];
        if (definition?.component !== undefined) {
            view.set(definition.component());
            return;
        }
        if (definition?.load !== undefined) {
            let cancelled = false;
            onCleanup(() => {
                cancelled = true;
            });
            view.set(props.loading ?? null);
            void definition.load().then((module) => {
                if (!cancelled) {
                    view.set(module.default());
                }
            });
            return;
        }
        view.set(props.fallback ?? null);
    });

    return view;
}

/** Props accepted by {@link Link}. */
export interface LinkProps {
    /** Target route name. */
    readonly to: string;
    /** Route params, when the target path needs them. */
    readonly params?: Readonly<Record<string, string>>;
    /** Replace the history entry instead of pushing one. */
    readonly replace?: boolean;
    /** Optional class name. */
    readonly class?: string;
    /** Accessible label for icon-only links. */
    readonly "aria-label"?: string;
    readonly children?: Child;
}

/** Loose internal view of the router, used to avoid generic noise in JSX. */
interface NavigableRouter {
    href(name: string, params?: Readonly<Record<string, string>>): string;
    navigate(name: string, params?: Readonly<Record<string, string>>, options?: NavigateOptions): void;
}

/**
 * Anchor that navigates through the router.
 *
 * Modified clicks (Ctrl, Meta, Shift, middle button) keep the native browser
 * behaviour so "open in a new tab" still works.
 */
export function Link(props: LinkProps): Child {
    const router = useRouter() as unknown as NavigableRouter;
    const href = router.href(props.to, props.params);
    const onClick = (event: MouseEvent): void => {
        if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
        ) {
            return;
        }
        event.preventDefault();
        router.navigate(props.to, props.params, { replace: props.replace });
    };

    return jsx("a", { href, class: props.class, onClick, "aria-label": props["aria-label"] }, props.children);
}
