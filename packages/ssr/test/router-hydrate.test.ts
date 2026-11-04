// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { hydrate, jsx, type Child } from "@kyneticweb/dom";
import { createContext, useContext } from "@kyneticweb/dom";
import { createMemoryStrategy, createRouter, RouterProvider, RouterView } from "@kyneticweb/router";
import { renderToStringAsync } from "../src/index.js";

async function tick(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
}

const routes = {
    home: { path: "/", component: (): Child => jsx("h1", null, "home") },
    about: { path: "/about", component: (): Child => jsx("h1", null, "about") },
} as const;

describe("router hydration", () => {
    it("adopts the server view and keeps it reactive", async () => {
        const server = createRouter({ routes, strategy: createMemoryStrategy("/") });
        server.start();

        const container = document.createElement("div");
        container.innerHTML = await renderToStringAsync(() =>
            jsx(RouterProvider, { router: server }, () => jsx(RouterView, null)),
        );
        server.stop();

        const heading = container.querySelector("h1");
        expect(heading?.textContent).toBe("home");

        const client = createRouter({ routes, strategy: createMemoryStrategy("/") });
        client.start();
        hydrate(() => jsx(RouterProvider, { router: client }, () => jsx(RouterView, null)), container);

        expect(container.querySelector("h1")).toBe(heading);
        expect(container.textContent).toBe("home");

        client.navigate("about");
        await tick();

        expect(container.querySelector("h1")?.textContent).toBe("about");
        expect(container.textContent).toBe("about");
        client.stop();
    });

    it("replaces the view on every navigation", async () => {
        const server = createRouter({ routes, strategy: createMemoryStrategy("/") });
        server.start();
        const container = document.createElement("div");
        container.innerHTML = await renderToStringAsync(() =>
            jsx(RouterProvider, { router: server }, () => jsx(RouterView, null)),
        );
        server.stop();

        const client = createRouter({ routes, strategy: createMemoryStrategy("/") });
        client.start();
        hydrate(() => jsx(RouterProvider, { router: client }, () => jsx(RouterView, null)), container);

        const visits: Array<[name: "home" | "about", text: string]> = [
            ["about", "about"],
            ["home", "home"],
            ["about", "about"],
        ];
        for (const [name, text] of visits) {
            client.navigate(name);
            await tick();
            expect(container.querySelectorAll("h1")).toHaveLength(1);
            expect(container.querySelector("h1")?.textContent).toBe(text);
        }
        client.stop();
    });

    it("adopts a preloaded lazy view and keeps its context", async () => {
        const Theme = createContext("light");
        const lazyRoutes = {
            home: { path: "/", component: (): Child => jsx("p", null, "home") },
            about: {
                path: "/about",
                load: async () => ({
                    default: (): Child => jsx("h1", null, useContext(Theme)),
                }),
            },
        } as const;

        const server = createRouter({ routes: lazyRoutes, strategy: createMemoryStrategy("/about") });
        server.start();
        const container = document.createElement("div");
        container.innerHTML = await renderToStringAsync(() =>
            jsx(Theme.Provider, { value: "dark" }, () =>
                jsx(RouterProvider, { router: server }, () => jsx(RouterView, null)),
            ),
        );
        const heading = container.querySelector("h1");
        expect(heading?.textContent).toBe("dark");
        server.stop();

        const client = createRouter({ routes: lazyRoutes, strategy: createMemoryStrategy("/about") });
        client.start();
        await client.preload();
        hydrate(
            () =>
                jsx(Theme.Provider, { value: "dark" }, () =>
                    jsx(RouterProvider, { router: client }, () => jsx(RouterView, null)),
                ),
            container,
        );

        expect(container.querySelector("h1")).toBe(heading);
        expect(container.textContent).toBe("dark");
        client.stop();
    });
});
