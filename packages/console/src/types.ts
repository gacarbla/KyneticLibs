/**
 * Shared types and defaults for the console package.
 *
 * The public surface is intentionally small and explicit so consumers get
 * complete IntelliSense without falling back to index signatures.
 */

/** Every message category understood by {@link ConsoleManager}. */
export type ConsoleLogType = "log" | "info" | "success" | "warn" | "error" | "debug" | "trace" | "ask" | "answer";

/** Fully resolved configuration used by {@link ConsoleManager}. */
export interface ConsoleConfig {
    /** Path of the file where every log line is persisted. */
    readonly logFilePath: string;
    /** Append to an existing file instead of truncating it. */
    readonly append: boolean;
    /** Add a timestamp and a random suffix to the configured file name. */
    readonly uniqueFile: boolean;
    /** Pattern used to render entry timestamps. */
    readonly dateFormat: string;
    /** Enable ANSI colours in plain output. */
    readonly color: boolean;
    /** Maximum number of entries kept in memory. */
    readonly maxEntries: number;
    /** Rendering strategy: automatic, forced blessed, or plain text. */
    readonly ui: "auto" | "blessed" | "plain";
}

/** A single entry stored by the log buffer. */
export interface ConsoleLogEntry {
    /** Short unique identifier for the entry. */
    readonly id: string;
    /** Message category. */
    readonly type: ConsoleLogType;
    /** Text written by the caller. */
    readonly message: string;
    /** Moment at which the entry was created. */
    readonly timestamp: Date;
}

/** Aggregated counters for the entries currently held in memory. */
export interface ConsoleStats {
    /** Number of stored entries. */
    readonly total: number;
    /** Number of stored entries per category. */
    readonly byType: Readonly<Record<ConsoleLogType, number>>;
}

/**
 * Contract implemented by every output strategy.
 *
 * Renderers receive entries after they have been stored and persisted, so a
 * renderer failure never loses data.
 */
export interface ILogRenderer {
    /**
     * Displays one entry.
     *
     * @param entry Entry to display.
     */
    render(entry: ConsoleLogEntry): void;

    /**
     * Releases the resources owned by the renderer.
     *
     * @returns A promise when disposal is asynchronous.
     */
    dispose(): void | Promise<void>;
}

/**
 * Default configuration applied when the caller does not provide a value.
 *
 * @example
 * ```ts
 * const config = { ...DEFAULT_CONSOLE_CONFIG, color: false };
 * ```
 */
export const DEFAULT_CONSOLE_CONFIG: ConsoleConfig = Object.freeze({
    logFilePath: "./logs/console.log",
    append: false,
    uniqueFile: false,
    dateFormat: "YY-MM-DD HH:mm:ss",
    color: true,
    maxEntries: 5000,
    ui: "auto",
});
