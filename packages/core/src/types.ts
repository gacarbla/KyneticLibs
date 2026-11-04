/**
 * Contracts used to compose libraries into a single object.
 *
 * A "tool" is any object that can be registered in {@link KyneticLibCore}. Tools
 * may optionally declare a `toolKind`, which makes them available as a direct
 * property of the core object (`core.console`, `core.container`, ...).
 */

/**
 * Optional contract implemented by the Kynetic libraries.
 *
 * `toolKind` must be a stable, unique identifier. When a tool is registered,
 * the core object exposes it directly under that name, in addition to the
 * alias used for registration.
 *
 * @example
 * ```ts
 * class MyTool implements Tool {
 *     public readonly toolKind = "my-tool" as const;
 *
 *     public dispose(): void {
 *         // release resources
 *     }
 * }
 * ```
 */
export interface Tool {
    /** Stable identifier used for the direct property on the core object. */
    readonly toolKind: string;

    /** Releases the resources held by the tool. */
    dispose?(): void | Promise<void>;

    /** Alternative cleanup hook, used when `dispose` is not implemented. */
    close?(): void | Promise<void>;
}

/**
 * Extracts the literal `toolKind` of a tool, or `never` when it does not
 * declare one.
 */
export type ToolKindOf<TTool> = TTool extends { readonly toolKind: infer TKind extends string } ? TKind : never;

/**
 * Maps a record of tools to the direct properties exposed on the core object.
 *
 * Tools without a `toolKind` are intentionally excluded.
 */
export type DirectTools<TTools> = {
    [TTool in TTools[keyof TTools] as string extends ToolKindOf<TTool> ? never : ToolKindOf<TTool>]: TTool;
};

/** Tool aliases that would shadow core members and are therefore not exposed. */
export const RESERVED_TOOL_KINDS: readonly string[] = Object.freeze(["tool", "constructor", "prototype"]);
