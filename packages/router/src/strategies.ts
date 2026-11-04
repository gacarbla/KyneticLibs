import type { Strategy } from "./types.js";

/** Removes a base prefix from a pathname. */
function stripBase(pathname: string, base: string): string {
    if (base.length === 0 || base === "/") {
        return pathname;
    }
    if (pathname === base) {
        return "/";
    }
    return pathname.startsWith(`${base}/`) ? pathname.slice(base.length) : pathname;
}

/**
 * History-based strategy (`/users/1`).
 *
 * @param base Optional base path when the app is not served from the root.
 */
export function createPathStrategy(base = ""): Strategy {
    const normalizedBase = base.replace(/\/$/, "");

    return {
        kind: "path",
        read() {
            return stripBase(window.location.pathname, normalizedBase) || "/";
        },
        push(path, state) {
            window.history.pushState(state ?? null, "", `${normalizedBase}${path}`);
        },
        replace(path, state) {
            window.history.replaceState(state ?? null, "", `${normalizedBase}${path}`);
        },
        subscribe(listener) {
            window.addEventListener("popstate", listener);
            return () => window.removeEventListener("popstate", listener);
        },
    };
}

/**
 * Hash-based strategy (`#/users/1`), useful for static hosting.
 */
export function createHashStrategy(): Strategy {
    const read = (): string => {
        const hash = window.location.hash.replace(/^#/, "");
        return hash.length === 0 ? "/" : hash;
    };

    return {
        kind: "hash",
        read,
        push(path) {
            window.location.hash = path;
        },
        replace(path) {
            window.location.replace(`#${path}`);
        },
        subscribe(listener) {
            window.addEventListener("hashchange", listener);
            return () => window.removeEventListener("hashchange", listener);
        },
    };
}

/**
 * In-memory strategy: the URL never changes.
 *
 * @param initial Starting path.
 */
export function createMemoryStrategy(initial = "/"): Strategy {
    let current = initial;
    const listeners = new Set<() => void>();

    return {
        kind: "memory",
        read() {
            return current;
        },
        push(path) {
            current = path;
            for (const listener of [...listeners]) {
                listener();
            }
        },
        replace(path) {
            current = path;
            for (const listener of [...listeners]) {
                listener();
            }
        },
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}
