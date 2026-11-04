import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createI18n } from "@kyneticweb/i18n";
import { createMemoryStrategy, createRouter } from "@kyneticweb/router";
import { renderToStringAsync } from "@kyneticweb/ssr";
import { createApp, routes } from "./app.js";
import { messages } from "./messages.js";

/** Directory produced by the client build. */
const clientDirectory = fileURLToPath(new URL("../client/", import.meta.url));
const template = await readFile(join(clientDirectory, "index.html"), "utf8");
const port = Number(process.env["PORT"] ?? 4173);

const CONTENT_TYPES: Readonly<Record<string, string>> = {
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2",
};

type Locale = keyof typeof messages & string;

/** Picks the best supported locale from `Accept-Language`. */
function localeFrom(request: IncomingMessage): Locale {
    const header = request.headers["accept-language"] ?? "";
    for (const candidate of header.split(",")) {
        const base = candidate.split(";")[0]?.trim().toLowerCase().split("-")[0];
        if (base === "es" || base === "en" || base === "gl") {
            return base;
        }
    }
    return "es";
}

/** Serves a client asset, refusing paths outside the build directory. */
async function serveAsset(pathname: string, response: ServerResponse): Promise<boolean> {
    const relative = pathname.replace(/^\/+/, "");
    if (!relative.startsWith("assets/")) {
        return false;
    }

    const file = resolve(clientDirectory, relative);
    const base = clientDirectory.endsWith(sep) ? clientDirectory : `${clientDirectory}${sep}`;
    if (!file.startsWith(base)) {
        response.writeHead(403).end("Forbidden");
        return true;
    }

    try {
        const body = await readFile(file);
        response.writeHead(200, { "content-type": CONTENT_TYPES[extname(file)] ?? "application/octet-stream" });
        response.end(body);
    } catch {
        response.writeHead(404).end("Not found");
    }
    return true;
}

/** Renders one request: router and translations are created per request. */
async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

    if (await serveAsset(url.pathname, response)) {
        return;
    }

    const i18n = createI18n({
        locale: localeFrom(request),
        messages,
        fallbackLocale: "en",
    });
    const router = createRouter({
        routes,
        strategy: createMemoryStrategy(url.pathname),
        fallback: "home",
    });
    router.start();

    try {
        const html = await renderToStringAsync(() => createApp(router, i18n));
        // A function replacement avoids `$&` patterns inside the markup.
        const page = template.replace("<!--app-->", () => html);
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        response.end(page);
    } finally {
        router.stop();
    }
}

const server = createServer((request, response) => {
    handle(request, response).catch((error: unknown) => {
        console.error(error);
        if (!response.headersSent) {
            response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        }
        response.end("Internal Server Error");
    });
});

server.listen(port, () => {
    console.log(`SSR example listening on http://localhost:${port}`);
});
