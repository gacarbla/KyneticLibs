/** Compiled path template. */
interface CompiledPath {
    readonly regex: RegExp;
    readonly keys: readonly string[];
}

const COMPILED = new Map<string, CompiledPath>();

/** Normalizes a path: leading slash, no trailing slash (except root). */
export function normalizePath(path: string): string {
    const withSlash = path.startsWith("/") ? path : `/${path}`;
    if (withSlash.length > 1 && withSlash.endsWith("/")) {
        return withSlash.slice(0, -1);
    }
    return withSlash;
}

/** Compiles a `/users/:id` template into an anchored regular expression. */
function compile(pattern: string): CompiledPath {
    const cached = COMPILED.get(pattern);
    if (cached !== undefined) {
        return cached;
    }

    const keys: string[] = [];
    let source = "^";

    for (const segment of normalizePath(pattern).split("/")) {
        if (segment.length === 0) {
            continue;
        }
        source += "/";
        if (segment === "*") {
            source += "(.*)";
            continue;
        }
        if (segment.startsWith(":")) {
            keys.push(segment.slice(1));
            source += "([^/]+)";
            continue;
        }
        source += escapeRegExp(segment);
    }

    source += "/?$";
    const compiled: CompiledPath = { regex: new RegExp(source), keys };
    COMPILED.set(pattern, compiled);
    return compiled;
}

/** Escapes regular expression metacharacters. */
function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Matches a path against a template.
 *
 * @returns Decoded params, or `null` when the path does not match.
 */
export function matchPath(pattern: string, path: string): Record<string, string> | null {
    const { regex, keys } = compile(pattern);
    const match = regex.exec(normalizePath(path));
    if (match === null) {
        return null;
    }

    const params: Record<string, string> = {};
    for (let index = 0; index < keys.length; index += 1) {
        const value = match[index + 1] ?? "";
        try {
            params[keys[index] as string] = decodeURIComponent(value);
        } catch {
            params[keys[index] as string] = value;
        }
    }
    return params;
}

/**
 * Builds a concrete path from a template and its params.
 *
 * @throws {Error} When a required param is missing.
 */
export function buildPath(pattern: string, params: Readonly<Record<string, string>> = {}): string {
    const built = normalizePath(pattern).replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_match, key: string) => {
        const value = params[key];
        if (value === undefined) {
            throw new Error(`Missing route param "${key}" for path "${pattern}".`);
        }
        return encodeURIComponent(value);
    });
    return built;
}
