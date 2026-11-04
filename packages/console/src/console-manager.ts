import { createInterface } from "node:readline/promises";
import { basename, dirname, extname, join } from "node:path";
import { formatDate, randomId } from "@kyneticweb/utils";
import { formatLogLine } from "./formatters.js";
import { LogStore } from "./log-store.js";
import { LogWriter } from "./log-writer.js";
import { BlessedRenderer } from "./renderers/blessed-renderer.js";
import { PlainRenderer } from "./renderers/plain-renderer.js";
import { DEFAULT_CONSOLE_CONFIG } from "./types.js";
import type { ConsoleConfig, ConsoleLogEntry, ConsoleLogType, ConsoleStats, ILogRenderer } from "./types.js";

/** Renderer that can also interact with the user. */
interface InteractiveRenderer extends ILogRenderer {
    ask(question: string): Promise<string>;
}

/** Streams used to read answers when no full-screen interface is active. */
export interface ConsoleStreams {
    /** Source of user input. Defaults to `process.stdin`. */
    readonly input?: NodeJS.ReadableStream;
    /** Destination of the question text. Defaults to `process.stdout`. */
    readonly output?: NodeJS.WritableStream;
}

/** Identifier used by `@kyneticweb/core` when registering the tool. */
const TOOL_KIND = "console";

/**
 * Facade that stores, persists and renders console messages.
 *
 * Every message is added to the bounded {@link LogStore}, written to disk and
 * finally handed to the active renderer, so output failures never lose data.
 *
 * @example
 * ```ts
 * const console = new ConsoleManager({ logFilePath: "./logs/app.log" });
 * console.info("Starting");
 * console.error("Database unavailable");
 * await console.close();
 * ```
 */
export class ConsoleManager {
    /**
     * Identifier used by `@kyneticweb/core` when registering the tool.
     *
     * @example
     * `console.toolKind; // "console"`
     */
    public readonly toolKind = TOOL_KIND;

    private readonly config: ConsoleConfig;
    private readonly logFilePath: string;
    private readonly store: LogStore;
    private readonly writer: LogWriter;
    private readonly streams: ConsoleStreams;
    private readonly rendererInjected: boolean;
    private readonly rendererDisabled: boolean;
    private renderer: ILogRenderer | null = null;
    private blessedRenderer: BlessedRenderer | null = null;
    private closePromise: Promise<void> | null = null;
    private fileErrorReported = false;
    private rendererErrorReported = false;
    private blessedFallbackReported = false;
    private blessedUnavailable = false;

    /**
     * @param config Partial configuration merged with {@link DEFAULT_CONSOLE_CONFIG}.
     * @param renderer Optional renderer. Pass `null` to disable rendering.
     * @param streams Streams used by `ask()` when no full-screen interface is
     * active. Defaults to the standard streams.
     * @throws {RangeError} When a numeric or textual option is invalid.
     * @throws {TypeError} When `logFilePath` is not a non-empty string.
     */
    public constructor(
        config: Partial<ConsoleConfig> = {},
        renderer?: ILogRenderer | null,
        streams: ConsoleStreams = {},
    ) {
        this.config = resolveConfig(config);
        this.logFilePath = resolveLogFilePath(this.config);
        this.store = new LogStore(this.config.maxEntries);
        this.writer = new LogWriter(this.logFilePath, { append: this.config.append });
        this.streams = streams;

        this.rendererInjected = renderer !== undefined && renderer !== null;
        this.rendererDisabled = renderer === null;

        if (this.rendererInjected) {
            this.renderer = renderer ?? null;
        } else if (!this.rendererDisabled && this.config.ui !== "blessed") {
            this.renderer = this.createPlainRenderer();
        }

        void this.writer.ready().catch((error: unknown) => this.reportFileError(error));
    }

    /**
     * Stores and renders a regular message.
     *
     * @param message Text to log.
     *
     * @example
     * ```ts
     * console.log("message");
     * ```
     */
    public log(message: string): void {
        this.writeEntry("log", message);
    }

    /**
     * Stores and renders an informational message.
     *
     * @param message Text to log.
     *
     * @example
     * ```ts
     * console.info("message");
     * ```
     */
    public info(message: string): void {
        this.writeEntry("info", message);
    }

    /**
     * Stores and renders a success message.
     *
     * @param message Text to log.
     *
     * @example
     * ```ts
     * console.success("message");
     * ```
     */
    public success(message: string): void {
        this.writeEntry("success", message);
    }

    /**
     * Stores and renders a warning.
     *
     * @param message Text to log.
     *
     * @example
     * ```ts
     * console.warn("message");
     * ```
     */
    public warn(message: string): void {
        this.writeEntry("warn", message);
    }

    /**
     * Stores and renders an error.
     *
     * @param message Text to log.
     *
     * @example
     * ```ts
     * console.error("message");
     * ```
     */
    public error(message: string): void {
        this.writeEntry("error", message);
    }

    /**
     * Stores and renders a debug message.
     *
     * @param message Text to log.
     *
     * @example
     * ```ts
     * console.debug("message");
     * ```
     */
    public debug(message: string): void {
        this.writeEntry("debug", message);
    }

    /**
     * Stores and renders a trace message.
     *
     * @param message Text to log.
     *
     * @example
     * ```ts
     * console.trace("message");
     * ```
     */
    public trace(message: string): void {
        this.writeEntry("trace", message);
    }

    /**
     * Asks the user a question and records both sides of the conversation.
     *
     * A blessed prompt is used when the active renderer supports it;
     * otherwise `node:readline/promises` reads from the standard streams.
     *
     * @param question Text shown to the user.
     * @returns The answer typed by the user.
     *
     * @example
     * ```ts
     * const answer = await console.ask("Continue?");
     * ```
     */
    public async ask(question: string): Promise<string> {
        if (this.isClosed()) {
            return "";
        }

        this.writeEntry("ask", question);
        const interactive = await this.resolveInteractiveRenderer();
        const answer = interactive === null ? await this.askWithReadline(question) : await interactive.ask(question);
        this.writeEntry("answer", answer);
        return answer;
    }

    /**
     * Returns a defensive copy of the entries currently stored.
     *
     * @returns Entries ordered from oldest to newest.
     *
     * @example
     * ```ts
     * const logs = console.getLogs();
     * ```
     */
    public getLogs(): ConsoleLogEntry[] {
        return this.store.entries();
    }

    /**
     * Returns counters computed from the entries currently stored.
     *
     * @returns Total count and a per-category breakdown.
     *
     * @example
     * ```ts
     * const stats = console.getStats();
     * ```
     */
    public getStats(): ConsoleStats {
        return this.store.stats();
    }

    /**
     * Starts the full-screen interface unless a renderer was injected.
     *
     * When `ui` is `"auto"` and blessed is unavailable, the existing plain
     * renderer is kept and a single warning is emitted.
     *
     * @returns This manager, for chaining.
     * @throws {Error} When `ui` is `"blessed"` and the package cannot load.
     *
     * @example
     * ```ts
     * await console.enableUI();
     * ```
     */
    public async enableUI(): Promise<this> {
        if (this.isClosed()) {
            return this;
        }
        if (this.config.ui === "plain" || this.blessedRenderer !== null || this.blessedUnavailable) {
            return this;
        }
        if (this.rendererInjected || this.rendererDisabled) {
            return this;
        }

        try {
            await this.activateBlessed();
        } catch (error) {
            if (this.config.ui === "blessed") {
                throw new Error('The "blessed" interface was requested but the optional package could not be loaded.', {
                    cause: error,
                });
            }
            this.blessedUnavailable = true;
            this.reportBlessedFallback(error);
        }
        return this;
    }

    /**
     * Flushes the log file and disposes the active renderer.
     *
     * Calling this method more than once is safe.
     *
     * @returns A promise resolved when every resource is released.
     *
     * @example
     * ```ts
     * await console.close();
     * ```
     */
    public close(): Promise<void> {
        if (this.closePromise !== null) {
            return this.closePromise;
        }

        this.closePromise = (async (): Promise<void> => {
            const renderer = this.renderer;
            this.renderer = null;
            this.blessedRenderer = null;

            try {
                if (renderer !== null) {
                    await renderer.dispose();
                }
            } catch (error) {
                this.reportRendererError(error);
            } finally {
                await this.writer.close();
            }

            if (this.writer.error !== null) {
                this.reportFileError(this.writer.error);
            }
        })();

        return this.closePromise;
    }

    /** Whether {@link close} has been called. */
    private isClosed(): boolean {
        return this.closePromise !== null;
    }

    /** Creates the blessed renderer and replaces the current one. */
    private async activateBlessed(): Promise<void> {
        const blessed = await BlessedRenderer.create(this.logFilePath, this.config.dateFormat);

        try {
            for (const entry of this.store.entries()) {
                blessed.render(entry);
            }
        } catch (error) {
            await blessed.dispose();
            throw error;
        }

        const previous = this.renderer;
        this.renderer = blessed;
        this.blessedRenderer = blessed;
        if (previous !== null) {
            await previous.dispose();
        }
    }

    /** Creates the stored entry, persists it and renders it. */
    private writeEntry(type: ConsoleLogType, message: string): void {
        const entry: ConsoleLogEntry = {
            id: randomId(),
            type,
            message,
            timestamp: new Date(),
        };

        this.store.add(entry);
        this.persist(entry);
        this.render(entry);
    }

    /** Writes one line to disk without letting failures escape. */
    private persist(entry: ConsoleLogEntry): void {
        try {
            this.writer.write(formatLogLine(entry, this.config.dateFormat));
        } catch (error) {
            this.reportFileError(error);
        }
    }

    /** Hands an entry to the active renderer without letting failures escape. */
    private render(entry: ConsoleLogEntry): void {
        if (this.renderer === null) {
            return;
        }

        try {
            this.renderer.render(entry);
        } catch (error) {
            this.reportRendererError(error);
        }
    }

    /** Loads the blessed renderer lazily when `ask()` needs interaction. */
    private async resolveInteractiveRenderer(): Promise<InteractiveRenderer | null> {
        if (this.isClosed()) {
            return null;
        }

        const shouldStartUI = this.renderer === null && !this.rendererInjected && !this.rendererDisabled;
        if (shouldStartUI && this.config.ui !== "plain") {
            await this.enableUI();
        }

        const renderer = this.renderer;
        if (renderer !== null && isInteractiveRenderer(renderer)) {
            return renderer;
        }
        return null;
    }

    /** Reads one answer from the configured streams. */
    private async askWithReadline(question: string): Promise<string> {
        const input = this.streams.input ?? process.stdin;
        const output = this.streams.output ?? process.stdout;

        // Without a terminal, `readline.question` would wait forever. CI and
        // redirected processes get an empty answer instead of a hang.
        if (input === process.stdin && process.stdin.isTTY !== true) {
            return "";
        }

        const readline = createInterface({ input, output });
        try {
            return await readline.question(`${question} `);
        } finally {
            readline.close();
        }
    }

    /** Builds the renderer used when blessed is not active. */
    private createPlainRenderer(): PlainRenderer {
        return new PlainRenderer({
            color: this.config.color,
            dateFormat: this.config.dateFormat,
        });
    }

    /** Reports asynchronous file failures once. */
    private reportFileError(error: unknown): void {
        if (this.fileErrorReported) {
            return;
        }
        this.fileErrorReported = true;
        console.error(`[console] Unable to write to the log file: ${describeError(error)}`);
    }

    /** Reports renderer failures once. */
    private reportRendererError(error: unknown): void {
        if (this.rendererErrorReported) {
            return;
        }
        this.rendererErrorReported = true;
        console.error(`[console] The renderer failed: ${describeError(error)}`);
    }

    /** Warns once when the blessed UI falls back to plain output. */
    private reportBlessedFallback(error: unknown): void {
        if (this.blessedFallbackReported) {
            return;
        }
        this.blessedFallbackReported = true;
        console.warn(`[console] Blessed is unavailable; using plain output. ${describeError(error)}`);
    }
}

/**
 * Creates a {@link ConsoleManager} without using `new`.
 *
 * @param config Partial configuration merged with the defaults.
 * @param renderer Optional renderer. Pass `null` to disable rendering.
 * @returns A configured manager.
 *
 * @example
 * ```ts
 * const console = createConsoleManager({ color: false });
 * ```
 */
export function createConsoleManager(
    config: Partial<ConsoleConfig> = {},
    renderer?: ILogRenderer | null,
): ConsoleManager {
    return new ConsoleManager(config, renderer);
}

/** Computes the concrete file path, applying the unique suffix when asked. */
function resolveLogFilePath(config: ConsoleConfig): string {
    if (!config.uniqueFile) {
        return config.logFilePath;
    }

    const stamp = formatDate(new Date(), "YYYYMMDD-HHmmss");
    const extension = extname(config.logFilePath);
    const baseName = basename(config.logFilePath, extension);
    return join(dirname(config.logFilePath), `${baseName}-${stamp}-${randomId(6)}${extension}`);
}

/** Merges defaults with overrides and validates the result. */
function resolveConfig(overrides: Partial<ConsoleConfig>): ConsoleConfig {
    const config: ConsoleConfig = {
        logFilePath: overrides.logFilePath ?? DEFAULT_CONSOLE_CONFIG.logFilePath,
        append: overrides.append ?? DEFAULT_CONSOLE_CONFIG.append,
        uniqueFile: overrides.uniqueFile ?? DEFAULT_CONSOLE_CONFIG.uniqueFile,
        dateFormat: overrides.dateFormat ?? DEFAULT_CONSOLE_CONFIG.dateFormat,
        color: overrides.color ?? DEFAULT_CONSOLE_CONFIG.color,
        maxEntries: overrides.maxEntries ?? DEFAULT_CONSOLE_CONFIG.maxEntries,
        ui: overrides.ui ?? DEFAULT_CONSOLE_CONFIG.ui,
    };

    if (typeof config.logFilePath !== "string" || config.logFilePath.trim().length === 0) {
        throw new TypeError("The log file path must be a non-empty string.");
    }
    if (typeof config.dateFormat !== "string" || config.dateFormat.trim().length === 0) {
        throw new RangeError("The date format must be a non-empty string.");
    }
    if (!Number.isInteger(config.maxEntries) || config.maxEntries < 1) {
        throw new RangeError("The maximum number of entries must be a positive integer.");
    }
    if (config.ui !== "auto" && config.ui !== "blessed" && config.ui !== "plain") {
        throw new RangeError('The UI mode must be "auto", "blessed" or "plain".');
    }

    return Object.freeze(config);
}

/** Narrows a renderer that exposes an `ask` method. */
function isInteractiveRenderer(renderer: ILogRenderer): renderer is InteractiveRenderer {
    return "ask" in renderer && typeof renderer.ask === "function";
}

/** Produces a readable error message for unknown failures. */
function describeError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
