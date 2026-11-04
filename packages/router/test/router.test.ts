// @vitest-environment happy-dom
import { describe, expect, expectTypeOf, it } from "vitest";
import { jsx, render, type Child } from "@kyneticweb/dom";
import {
    buildPath,
    createHashStrategy,
    createMemoryStrategy,
    createPathStrategy,
    createRouter,
    Link,
    matchPath,
    RouterProvider,
    RouterView,
} from "../src/index.js";

async function tick(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
}

const routes = {
    home: { path: "/", component: (): Child => jsx("p", null, "home") },
    user: { path: "/users/:id", component: (): Child => jsx("p", null, "user") },
    settings: { path: "/settings", component: (): Child => jsx("p", null, "settings") },
} as const;

describe("path matching", () => {
    it("matches params and builds paths", () => {
        expect(matchPath("/users/:id", "/users/42")).toEqual({ id: "42" });
        expect(matchPath("/users/:id/posts/:postId", "/users/1/posts/9")).toEqual({ id: "1", postId: "9" });
        expect(matchPath("/users/:id", "/settings")).toBeNull();
        expect(buildPath("/users/:id", { id: "a b" })).toBe("/users/a%20b");
    });

    it("throws on missing params", () => {
        expect(() => buildPath("/users/:id", {})).toThrow('Missing route param "id"');
    });
});

describe("memory router", () => {
    it("starts at the initial path and navigates with typed params", () => {
        const router = createRouter({ routes, strategy: createMemoryStrategy("/") });
        router.start();

        expect(router.route()?.name).toBe("home");
        expect(router.href("user", { id: "42" })).toBe("/users/42");

        router.navigate("user", { id: "42" });

        const current = router.route();
        expect(current?.name).toBe("user");
        if (current?.name === "user") {
            expect(current.params.id).toBe("42");
        }

        expectTypeOf(router.href("settings")).toEqualTypeOf<string>();
    });

    it("uses the fallback for unknown paths", () => {
        const router = createRouter({
            routes,
            strategy: createMemoryStrategy("/missing"),
            fallback: "home",
        });
        router.start();

        expect(router.route()?.name).toBe("home");
    });

    it("cancels and redirects with guards", () => {
        const router = createRouter({ routes, strategy: createMemoryStrategy("/") });
        router.start();

        const stop = router.beforeEach((to) => (to.name === "settings" ? false : true));
        router.navigate("settings");
        expect(router.route()?.name).toBe("home");
        stop();

        router.beforeEach((to) => (to.name === "settings" ? "home" : true));
        router.navigate("settings");
        expect(router.route()?.name).toBe("home");
    });

    it("requires params at the type level", () => {
        const router = createRouter({ routes, strategy: createMemoryStrategy("/") });

        const typecheck = (typed: typeof router): void => {
            // @ts-expect-error - the user route needs params.
            typed.navigate("user");
            typed.navigate("settings");
        };
        void typecheck;
        expect(router.route()).toBeNull();
    });
});

describe("browser strategies", () => {
    it("navigates with the history strategy", () => {
        window.history.replaceState(null, "", "/");
        const router = createRouter({ routes, strategy: createPathStrategy() });
        router.start();

        router.navigate("user", { id: "7" });

        expect(window.location.pathname).toBe("/users/7");
        expect(router.route()?.name).toBe("user");
    });

    it("navigates with the hash strategy", () => {
        window.location.hash = "#/";
        const router = createRouter({ routes, strategy: createHashStrategy() });
        router.start();

        router.navigate("settings");

        expect(window.location.hash).toBe("#/settings");
        expect(router.route()?.name).toBe("settings");
    });
});

describe("view and links", () => {
    it("renders the matched route and switches views", async () => {
        const router = createRouter({ routes, strategy: createMemoryStrategy("/") });
        const container = document.createElement("div");

        render(
            () => jsx(RouterProvider, { router }, () => jsx(RouterView, { fallback: jsx("p", null, "missing") })),
            container,
        );
        router.start();
        await tick();

        expect(container.textContent).toBe("home");

        router.navigate("user", { id: "1" });
        await tick();
        expect(container.textContent).toBe("user");
    });

    it("renders lazy routes after loading", async () => {
        let resolveModule!: (module: { default: () => Child }) => void;
        const modulePromise = new Promise<{ default: () => Child }>((resolve) => {
            resolveModule = resolve;
        });
        const lazyRoutes = {
            home: { path: "/", component: (): Child => jsx("p", null, "home") },
            lazy: {
                path: "/lazy",
                load: async () => modulePromise,
            },
        } as const;
        const router = createRouter({ routes: lazyRoutes, strategy: createMemoryStrategy("/") });
        const container = document.createElement("div");

        render(
            () => jsx(RouterProvider, { router }, () => jsx(RouterView, { loading: jsx("p", null, "loading") })),
            container,
        );
        router.start();
        await tick();

        router.navigate("lazy");
        await tick();
        expect(container.textContent).toBe("loading");

        resolveModule({ default: () => jsx("p", null, "lazy") });
        await tick();
        await tick();
        expect(container.textContent).toBe("lazy");
    });

    it("navigates when a Link is clicked", () => {
        const router = createRouter({ routes, strategy: createMemoryStrategy("/") });
        const container = document.createElement("div");

        render(
            () => jsx(RouterProvider, { router }, () => jsx("nav", null, jsx(Link, { to: "settings" }, "settings"))),
            container,
        );
        router.start();

        const anchor = container.querySelector("a") as HTMLAnchorElement;
        expect(anchor.getAttribute("href")).toBe("/settings");

        anchor.click();
        expect(router.route()?.name).toBe("settings");
    });

    it("keeps the current route reactive", async () => {
        const router = createRouter({ routes, strategy: createMemoryStrategy("/") });
        const container = document.createElement("div");

        router.start();
        await tick();

        render(() => jsx("p", null, () => router.route()?.name ?? "none"), container);
        expect(container.textContent).toBe("home");

        router.navigate("settings");
        await tick();
        expect(container.textContent).toBe("settings");
    });
});
