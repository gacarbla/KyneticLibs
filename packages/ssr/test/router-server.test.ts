import { describe, expect, it } from "vitest";
import { jsx, type Child } from "@kyneticweb/dom";
import { createMemoryStrategy, createRouter, RouterProvider, RouterView, useRoute } from "@kyneticweb/router";
import type { RoutePathMap } from "@kyneticweb/router";
import { renderToString, renderToStringAsync } from "../src/index.js";

describe("router on the server", () => {
    it("renders the matched eager route", () => {
        const routes = {
            home: { path: "/", component: (): Child => jsx("h1", null, "home") },
        } as const;
        const router = createRouter({ routes, strategy: createMemoryStrategy("/") });
        router.start();

        const html = renderToString(() => jsx(RouterProvider, { router }, () => jsx(RouterView, null)));

        expect(html).toBe("<h1>home</h1>");
        router.stop();
    });

    it("renders the current params through the router", () => {
        const routes = {
            home: { path: "/", component: (): Child => jsx("p", null, "home") },
            user: {
                path: "/users/:id",
                component: (): Child => {
                    const route = useRoute<RoutePathMap<typeof routes>>()();
                    return jsx("p", null, route?.name === "user" ? route.params.id : "unknown");
                },
            },
        } as const;
        const router = createRouter({ routes, strategy: createMemoryStrategy("/users/42") });
        router.start();

        const html = renderToString(() => jsx(RouterProvider, { router }, () => jsx(RouterView, null)));

        expect(html).toBe("<p>42</p>");
        expect(router.route()?.name).toBe("user");
        router.stop();
    });

    it("awaits a lazy route and renders it on the next pass", async () => {
        let loads = 0;
        const routes = {
            home: { path: "/", component: (): Child => jsx("p", null, "home") },
            user: {
                path: "/users/:id",
                load: async () => {
                    loads += 1;
                    return { default: (): Child => jsx("p", null, "lazy user") };
                },
            },
        } as const;
        const router = createRouter({ routes, strategy: createMemoryStrategy("/users/42") });
        router.start();
        const view = () =>
            jsx(RouterProvider, { router }, () => jsx(RouterView, { loading: jsx("p", null, "loading") }));

        expect(renderToString(view)).toBe("<p>loading</p>");
        expect(await renderToStringAsync(view)).toBe("<p>lazy user</p>");
        expect(loads).toBeLessThanOrEqual(2);
        router.stop();
    });

    it("preloads a lazy route so the first render is synchronous", async () => {
        const routes = {
            about: {
                path: "/",
                load: async () => ({ default: (): Child => jsx("p", null, "preloaded") }),
            },
        } as const;
        const router = createRouter({ routes, strategy: createMemoryStrategy("/") });
        router.start();

        await router.preload();
        const html = renderToString(() => jsx(RouterProvider, { router }, () => jsx(RouterView, null)));

        expect(html).toBe("<p>preloaded</p>");
        router.stop();
    });

    it("uses the fallback when nothing matches", async () => {
        const routes = {
            home: { path: "/", component: (): Child => jsx("p", null, "home") },
        } as const;
        const router = createRouter({ routes, strategy: createMemoryStrategy("/missing") });
        router.start();

        const html = await renderToStringAsync(() =>
            jsx(RouterProvider, { router }, () => jsx(RouterView, { fallback: jsx("p", null, "not found") })),
        );

        expect(html).toBe("<p>not found</p>");
        router.stop();
    });
});
