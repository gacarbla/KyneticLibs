import type { DirectTools } from "./types.js";
import { RESERVED_TOOL_KINDS } from "./types.js";

/**
 * Composition of a {@link KyneticLibCore} instance with the direct properties
 * declared by its tools.
 *
 * `DirectTools` is what makes `core.console` and `core.container` available to
 * the TypeScript language service without losing the fluent `use()` chain.
 */
export type ComposedCore<TTools extends object> = KyneticLibCore<TTools> & DirectTools<TTools>;

/**
 * Registers libraries by alias and exposes them as a single, fully typed object.
 *
 * The core never inspects tool constructors: it only reads the optional
 * `toolKind` property, so it works with any class, subclass or plain object, and
 * it is immune to duplicated package copies in `node_modules`.
 *
 * @example
 * ```ts
 * const core = new KyneticLibCore()
 *     .use("log", new ConsoleManager())
 *     .use("store", new StrictContainer<AppContext>());
 *
 * core.console.log("ready");
 * core.tool.store.set("user", "gabriel");
 * ```
 */
export class KyneticLibCore<TTools extends object = Record<never, never>> {
    private readonly registry = new Map<string, object>();
    private readonly exposedKinds = new Map<string, object>();

    /**
     * Registers a tool under an alias.
     *
     * The returned type accumulates every registered alias, so `tool.<alias>`
     * and the direct `toolKind` properties autocomplete as you chain calls.
     *
     * @param alias Unique alias used to reach the tool through `core.tool`.
     * @param tool Instance to register.
     * @returns The same core instance, typed with the new tool.
     * @throws {Error} When the alias is already registered.
     */
    public use<K extends string, TTool extends object>(alias: K, tool: TTool): ComposedCore<TTools & Record<K, TTool>> {
        if (this.has(alias)) {
            throw new Error(`A tool is already registered with the alias "${alias}".`);
        }

        this.registry.set(alias, tool);
        this.exposeTool(tool);

        // SAFETY: the runtime registry now contains exactly the aliases
        // accumulated in TTools; the cast only teaches that fact to the type
        // system, which cannot track mutations of a Map.
        return this as unknown as ComposedCore<TTools & Record<K, TTool>>;
    }

    /**
     * Returns a tool by alias.
     *
     * Prefer `core.tool.<alias>`: it is fully typed and does not throw.
     *
     * @param alias Registered alias.
     * @throws {Error} When the alias is not registered.
     */
    public get<K extends string>(alias: K): K extends keyof TTools ? TTools[K] : object {
        const tool = this.registry.get(alias);
        if (tool === undefined) {
            throw new Error(`No tool is registered with the alias "${alias}".`);
        }
        // SAFETY: entries are written only by `use`, which accumulates their
        // exact type in TTools. A present alias therefore matches TTools.
        return tool as K extends keyof TTools ? TTools[K] : object;
    }

    /** Returns whether an alias is registered. */
    public has(alias: string): boolean {
        return this.registry.has(alias);
    }

    /**
     * Removes a tool by alias.
     *
     * @returns `true` when the tool existed.
     */
    public remove(alias: string): boolean {
        const tool = this.registry.get(alias);
        if (tool === undefined) {
            return false;
        }

        this.registry.delete(alias);
        this.hideToolIfUnused(tool);
        return true;
    }

    /** Number of registered tools. */
    public get size(): number {
        return this.registry.size;
    }

    /** Registered aliases, in registration order. */
    public aliases(): string[] {
        return [...this.registry.keys()];
    }

    /**
     * Snapshot of every registered tool, keyed by alias.
     *
     * The object is rebuilt on each access, so mutating it never affects the
     * core.
     */
    public get tool(): TTools {
        // SAFETY: the snapshot contains exactly the aliases accumulated in
        // TTools. It is a copy, so callers cannot corrupt the registry.
        return Object.fromEntries(this.registry) as TTools;
    }

    /**
     * Releases every tool that implements `dispose` or `close`, then clears the
     * registry.
     *
     * A tool registered under several aliases is released only once. Failures
     * are collected and thrown together, so one broken tool does not prevent
     * the others from being released.
     */
    public async dispose(): Promise<void> {
        const failures: Error[] = [];
        const disposed = new Set<object>();

        for (const [alias, tool] of this.registry) {
            if (disposed.has(tool)) {
                continue;
            }
            disposed.add(tool);

            try {
                await disposeTool(tool);
            } catch (error) {
                failures.push(new Error(`Failed to dispose "${alias}": ${toErrorMessage(error)}`));
            }
        }

        for (const kind of this.exposedKinds.keys()) {
            Reflect.deleteProperty(this, kind);
        }
        this.exposedKinds.clear();
        this.registry.clear();

        if (failures.length > 0) {
            throw new AggregateError(failures, "One or more tools could not be disposed.");
        }
    }

    /** Exposes a tool as a direct property when it declares a usable `toolKind`. */
    private exposeTool(tool: object): void {
        const kind = readToolKind(tool);

        if (kind === undefined) {
            return;
        }
        if (RESERVED_TOOL_KINDS.includes(kind) || kind in KyneticLibCore.prototype) {
            return;
        }
        if (this.exposedKinds.has(kind)) {
            return;
        }

        this.defineKindProperty(kind, tool);
        this.exposedKinds.set(kind, tool);
    }

    /**
     * Removes the direct property of a tool that is no longer registered, or
     * promotes another registered tool that shares its kind.
     */
    private hideToolIfUnused(tool: object): void {
        const kind = readToolKind(tool);

        if (kind === undefined || this.exposedKinds.get(kind) !== tool) {
            return;
        }

        const replacement = this.findToolByKind(kind);
        if (replacement !== undefined) {
            this.defineKindProperty(kind, replacement);
            this.exposedKinds.set(kind, replacement);
            return;
        }

        Reflect.deleteProperty(this, kind);
        this.exposedKinds.delete(kind);
    }

    /** Defines (or redefines) the direct property of a kind. */
    private defineKindProperty(kind: string, tool: object): void {
        Object.defineProperty(this, kind, {
            value: tool,
            enumerable: true,
            configurable: true,
            writable: false,
        });
    }

    /** Finds any registered tool declaring `kind`. */
    private findToolByKind(kind: string): object | undefined {
        for (const tool of this.registry.values()) {
            if (readToolKind(tool) === kind) {
                return tool;
            }
        }
        return undefined;
    }
}

/** Reads the optional `toolKind` of an arbitrary object. */
function readToolKind(tool: object): string | undefined {
    const candidate = readProperty(tool, "toolKind");
    return typeof candidate === "string" && candidate.length > 0 ? candidate : undefined;
}

/** Calls the cleanup hook of a single tool, if it has one. */
async function disposeTool(tool: object): Promise<void> {
    const hookName = hasFunctionProperty(tool, "dispose") ? "dispose" : "close";

    if (!hasFunctionProperty(tool, hookName)) {
        return;
    }

    const hook = readProperty(tool, hookName);
    // SAFETY: `hasFunctionProperty` guarantees the property is callable; the
    // cast restores the call signature that `unknown` erases.
    await (hook as () => unknown).call(tool);
}

/** Reads a property of an arbitrary object as `unknown`. */
function readProperty(tool: object, name: string): unknown {
    // SAFETY: reading an arbitrary property cannot be expressed without an
    // index access; the caller narrows the result immediately.
    return (tool as Record<string, unknown>)[name];
}

/** Reports whether an object owns a callable property. */
function hasFunctionProperty(tool: object, name: string): boolean {
    return typeof readProperty(tool, name) === "function";
}

/** Normalizes an unknown thrown value into a readable message. */
function toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
