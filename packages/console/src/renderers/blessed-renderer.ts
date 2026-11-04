import { spawn } from "node:child_process";
import type * as Blessed from "blessed";
import { formatDate, wrapText } from "@kyneticweb/utils";
import type { ConsoleLogEntry, ConsoleLogType, ILogRenderer } from "../types.js";

/** Runtime shape of the optional `blessed` package. */
type BlessedModule = typeof Blessed;
/** Screen instance created by `blessed.screen`. */
type BlessedScreen = Blessed.Widgets.Screen;
/** Box instance created by `blessed.box`. */
type BlessedBox = Blessed.Widgets.BoxElement;
/** Prompt instance created by `blessed.prompt`. */
type BlessedPrompt = Blessed.Widgets.PromptElement;

/** Maximum number of entries retained for resize recomputation. */
const MAX_ENTRIES = 5000;
/** Maximum number of wrapped rows retained per panel. */
const MAX_ROWS = 10000;
/** Width of the type column in the main panel. */
const LOG_TYPE_WIDTH = 9;
/** Width of the identifier column in the main panel. */
const LOG_ID_WIDTH = 11;
/** Width of the type column in the side panels. */
const SIDE_TYPE_WIDTH = 7;
/** Width of the identifier column in the side panels. */
const SIDE_ID_WIDTH = 10;

/** Blessed tag colours for every category. */
const BLESSED_COLORS: Readonly<Record<ConsoleLogType, string>> = {
    log: "{white-fg}",
    info: "{cyan-fg}",
    success: "{green-fg}",
    warn: "{yellow-fg}",
    error: "{red-fg}",
    debug: "{blue-fg}",
    trace: "{magenta-fg}",
    ask: "{cyan-fg}",
    answer: "{green-fg}",
};

/** Widgets produced while the screen is assembled. */
interface Panels {
    readonly logBox: BlessedBox;
    readonly errorBox: BlessedBox;
    readonly warnBox: BlessedBox;
    readonly utilsBox: BlessedBox;
}

/** Command used to reveal the log file in the platform file manager. */
interface OpenCommand {
    readonly command: string;
    readonly args: readonly string[];
}

/**
 * Full-screen interface powered by the optional `blessed` package.
 *
 * Entries are rendered incrementally: each call to {@link render} only wraps
 * and appends the new entry. Rows are recomputed from the retained entries
 * exclusively when the terminal is resized.
 *
 * @example
 * ```ts
 * const renderer = await BlessedRenderer.create("./logs/console.log", "YY-MM-DD HH:mm:ss");
 * renderer.render(entry);
 * const answer = await renderer.ask("Continue?");
 * renderer.dispose();
 * ```
 */
export class BlessedRenderer implements ILogRenderer {
    private readonly blessed: BlessedModule;
    private readonly screen: BlessedScreen;
    private readonly logBox: BlessedBox;
    private readonly errorBox: BlessedBox;
    private readonly warnBox: BlessedBox;
    private readonly utilsBox: BlessedBox;
    private readonly logFilePath: string;
    private readonly dateFormat: string;
    private readonly entries: ConsoleLogEntry[] = [];
    private readonly logRows: string[] = [];
    private readonly errorRows: string[] = [];
    private readonly warnRows: string[] = [];
    private disposed = false;
    private asking = false;
    private pendingPrompt: { finish(value: string): void } | null = null;

    /**
     * Loads `blessed` dynamically and builds the interface.
     *
     * @param logFilePath File revealed by the `l` key.
     * @param dateFormat Timestamp pattern used by the side panels.
     * @returns A ready-to-use renderer.
     * @throws {Error} When the optional `blessed` package is unavailable.
     *
     * @example
     * ```ts
     * const renderer = await BlessedRenderer.create("./logs/console.log", "YY-MM-DD HH:mm:ss");
     * ```
     */
    public static async create(logFilePath: string, dateFormat: string): Promise<BlessedRenderer> {
        const blessed = await loadBlessed();
        return new BlessedRenderer(blessed, logFilePath, dateFormat);
    }

    private constructor(blessed: BlessedModule, logFilePath: string, dateFormat: string) {
        this.blessed = blessed;
        this.logFilePath = logFilePath;
        this.dateFormat = dateFormat;
        this.screen = blessed.screen({ smartCSR: true, title: "ConsoleManager" });

        const panels = createPanels(blessed, this.screen);
        this.logBox = panels.logBox;
        this.errorBox = panels.errorBox;
        this.warnBox = panels.warnBox;
        this.utilsBox = panels.utilsBox;

        this.configureKeys();
        this.safeRender();
    }

    /**
     * Appends one entry to the appropriate panels.
     *
     * @param entry Entry to display.
     *
     * @example
     * ```ts
     * renderer.render(entry);
     * ```
     */
    public render(entry: ConsoleLogEntry): void {
        if (this.disposed) {
            return;
        }

        this.entries.push(entry);
        if (this.entries.length > MAX_ENTRIES) {
            this.entries.shift();
        }

        this.appendLogRows(entry);
        this.appendSideRows(entry);
        this.updateUtilities(entry);
        this.safeRender();
    }

    /**
     * Asks a question through a blessed prompt.
     *
     * When the prompt input is unavailable, or the interface has been
     * disposed, the promise resolves with an empty string instead of hanging.
     *
     * @param question Text shown to the user.
     * @returns The answer typed by the user, or `""` when unavailable.
     *
     * @example
     * ```ts
     * const answer = await renderer.ask("Continue?");
     * ```
     */
    public ask(question: string): Promise<string> {
        if (this.disposed) {
            return Promise.resolve("");
        }

        let prompt: BlessedPrompt;
        try {
            prompt = this.blessed.prompt({
                parent: this.screen,
                border: "line",
                height: 7,
                width: "50%",
                top: "center",
                left: "center",
                tags: true,
                keys: true,
                vi: true,
                mouse: true,
                style: { border: { fg: "cyan" } },
            });
        } catch {
            return Promise.resolve("");
        }

        if (typeof prompt.input !== "function") {
            safeDestroy(prompt);
            return Promise.resolve("");
        }

        this.asking = true;
        return new Promise<string>((resolveAnswer) => {
            let settled = false;
            const finish = (value: string): void => {
                if (settled) {
                    return;
                }
                settled = true;
                this.pendingPrompt = null;
                this.asking = false;
                safeDestroy(prompt);
                this.focusLogs();
                this.safeRender();
                resolveAnswer(value);
            };

            this.pendingPrompt = { finish };
            focusPromptInput(prompt);
            this.safeRender();

            try {
                prompt.input(question, "", (_error: unknown, value: string) => {
                    finish(typeof value === "string" ? value : "");
                });
            } catch {
                finish("");
            }
        });
    }

    /**
     * Destroys the blessed screen and releases its listeners.
     *
     * Calling this method more than once is safe.
     *
     * @example
     * ```ts
     * renderer.dispose();
     * ```
     */
    public dispose(): void {
        if (this.disposed) {
            return;
        }
        this.disposed = true;

        this.pendingPrompt?.finish("");
        this.pendingPrompt = null;

        try {
            this.screen.destroy();
        } catch {
            // The screen may already be partially torn down.
        }
    }

    /** Registers the global key bindings and the resize listener. */
    private configureKeys(): void {
        this.screen.key(["q", "C-c"], () => this.exit());
        this.screen.key(["l"], () => this.openLogFile());
        this.screen.on("resize", () => this.recalculate());
        this.screen.on("render", () => {
            if (!this.asking) {
                this.focusLogs();
            }
        });
    }

    /** Destroys the screen and exits, never leaving the terminal dirty. */
    private exit(): void {
        this.dispose();
        process.exit(0);
    }

    /** Reveals the log file with a platform-specific command. */
    private openLogFile(): void {
        const openCommand = resolveOpenCommand(this.logFilePath);
        try {
            const child = spawn(openCommand.command, openCommand.args, { detached: true, stdio: "ignore" });
            child.on("error", () => undefined);
            child.unref();
        } catch {
            // Opening the file is a convenience; failures are not fatal.
        }
    }

    /** Appends the rows of one entry to the main panel. */
    private appendLogRows(entry: ConsoleLogEntry): void {
        const rows = this.buildEntryRows(entry, this.logMessageWidth(), LOG_TYPE_WIDTH, LOG_ID_WIDTH);
        const overflow = appendWithLimit(this.logRows, rows, MAX_ROWS);
        this.appendToBox(this.logBox, rows, this.logRows, overflow);
    }

    /** Appends the rows of one entry to the side panels when relevant. */
    private appendSideRows(entry: ConsoleLogEntry): void {
        if (entry.type === "error") {
            const rows = this.buildSideRows(entry);
            const overflow = appendWithLimit(this.errorRows, rows, MAX_ROWS);
            this.appendToBox(this.errorBox, rows, this.errorRows, overflow);
            return;
        }

        if (entry.type === "warn") {
            const rows = this.buildSideRows(entry);
            const overflow = appendWithLimit(this.warnRows, rows, MAX_ROWS);
            this.appendToBox(this.warnBox, rows, this.warnRows, overflow);
        }
    }

    /** Builds the rows shown in the error or warning panel. */
    private buildSideRows(entry: ConsoleLogEntry): string[] {
        return this.buildEntryRows(entry, this.sideMessageWidth(), SIDE_TYPE_WIDTH, SIDE_ID_WIDTH);
    }

    /** Updates the utilities panel with the latest entry time. */
    private updateUtilities(entry: ConsoleLogEntry): void {
        try {
            const timestamp = formatDate(entry.timestamp, this.dateFormat);
            this.utilsBox.setContent(`L: Open Log File\nQ/Ctrl+C: Exit\nLast: ${timestamp}`);
        } catch {
            // A destroyed widget must not interrupt logging.
        }
    }

    /** Rebuilds every panel after a terminal resize. */
    private recalculate(): void {
        if (this.disposed) {
            return;
        }

        this.logRows.length = 0;
        this.errorRows.length = 0;
        this.warnRows.length = 0;

        for (const entry of this.entries) {
            this.rebuildEntryRows(entry);
        }

        trimToLimit(this.logRows, MAX_ROWS);
        trimToLimit(this.errorRows, MAX_ROWS);
        trimToLimit(this.warnRows, MAX_ROWS);

        this.replaceContent(this.logBox, this.logRows);
        this.replaceContent(this.errorBox, this.errorRows);
        this.replaceContent(this.warnBox, this.warnRows);
        this.safeRender();
    }

    /** Recomputes the rows of one retained entry after a resize. */
    private rebuildEntryRows(entry: ConsoleLogEntry): void {
        this.logRows.push(...this.buildEntryRows(entry, this.logMessageWidth(), LOG_TYPE_WIDTH, LOG_ID_WIDTH));
        if (entry.type === "error") {
            this.errorRows.push(...this.buildSideRows(entry));
        }
        if (entry.type === "warn") {
            this.warnRows.push(...this.buildSideRows(entry));
        }
    }

    /** Wraps an entry into styled rows that fit the requested columns. */
    private buildEntryRows(entry: ConsoleLogEntry, messageWidth: number, typeWidth: number, idWidth: number): string[] {
        const color = BLESSED_COLORS[entry.type];
        const wrapped = wrapText(this.escapeText(entry.message), messageWidth);
        const lines = wrapped.length > 0 ? wrapped : [""];

        return lines.map((line, index) => {
            if (index > 0) {
                return ` ${" ".repeat(typeWidth)} ${" ".repeat(idWidth)}${line}`;
            }
            const type = entry.type.toUpperCase().padEnd(typeWidth, " ");
            const identifier = entry.id.padEnd(idWidth, " ");
            return ` ${color}${type}{/} ${identifier}${line}`;
        });
    }

    /** Pushes rows to a panel, honouring the row limit and graceful fallback. */
    private appendToBox(box: BlessedBox, rows: string[], allRows: string[], overflow: number): void {
        try {
            if (typeof box.pushLine === "function") {
                box.pushLine(rows);
                if (overflow > 0 && typeof box.shiftLine === "function") {
                    box.shiftLine(overflow);
                }
            } else {
                box.setContent(allRows.join("\n"));
            }
            scrollToBottom(box);
        } catch {
            // A destroyed widget must not interrupt logging.
        }
    }

    /** Replaces the content of a panel with a rebuilt row list. */
    private replaceContent(box: BlessedBox, rows: string[]): void {
        try {
            box.setContent(rows.join("\n"));
            scrollToBottom(box);
        } catch {
            // A destroyed widget must not interrupt logging.
        }
    }

    /** Escapes blessed tags found in user messages. */
    private escapeText(text: string): string {
        if (typeof this.blessed.escape === "function") {
            return this.blessed.escape(text);
        }
        return text.replaceAll("{", "\\{");
    }

    /** Number of message characters available in the main panel. */
    private logMessageWidth(): number {
        return Math.max(10, Math.floor(this.screenWidth() * 0.5) - LOG_TYPE_WIDTH - LOG_ID_WIDTH - 4);
    }

    /** Number of message characters available in the side panels. */
    private sideMessageWidth(): number {
        return Math.max(10, Math.floor(this.screenWidth() * 0.5) - SIDE_TYPE_WIDTH - SIDE_ID_WIDTH - 4);
    }

    /** Current screen width with a safe fallback for headless runners. */
    private screenWidth(): number {
        try {
            const width = this.screen.width;
            return typeof width === "number" && Number.isFinite(width) && width > 20 ? width : 80;
        } catch {
            return 80;
        }
    }

    /** Moves the keyboard focus back to the main panel. */
    private focusLogs(): void {
        if (this.disposed || this.asking) {
            return;
        }
        try {
            if (typeof this.logBox.focus === "function") {
                this.logBox.focus();
            }
        } catch {
            // The widget may be gone during shutdown.
        }
    }

    /** Renders the screen, ignoring failures during shutdown. */
    private safeRender(): void {
        if (this.disposed) {
            return;
        }
        try {
            this.screen.render();
        } catch {
            // Rendering must never take the process down.
        }
    }
}

/** Dynamically imports the optional blessed package with a clear error. */
async function loadBlessed(): Promise<BlessedModule> {
    let loaded: unknown;
    try {
        loaded = await import("blessed");
    } catch (error) {
        throw new Error(
            'The "blessed" package is optional and could not be loaded. Install it to use the full-screen interface.',
            { cause: error },
        );
    }

    // Boundary cast 1/2: a CommonJS dynamic import may expose the API through
    // `default`, depending on how Node wraps the module.
    const namespace = loaded as { readonly default?: BlessedModule };
    // Boundary cast 2/2: when there is no interop wrapper, the namespace itself
    // is the blessed API object.
    const blessed = namespace.default ?? (loaded as BlessedModule);

    if (typeof blessed.screen !== "function") {
        throw new Error('The "blessed" package did not expose the expected API.');
    }
    return blessed;
}

/** Builds every panel and the utility help box. */
function createPanels(blessed: BlessedModule, screen: BlessedScreen): Panels {
    blessed.box({
        parent: screen,
        top: 0,
        left: 0,
        width: "50%",
        height: 1,
        tags: true,
        content: "{bold} Type     ID         Message{/bold}",
        style: { fg: "white", bg: "black" },
    });

    const logBox = blessed.box({
        parent: screen,
        top: 1,
        left: 0,
        width: "50%",
        height: "100%-1",
        border: "line",
        tags: true,
        scrollable: true,
        alwaysScroll: true,
        mouse: true,
        keys: true,
        vi: false,
        scrollback: MAX_ROWS,
        scrollbar: { ch: " ", track: { bg: "grey" }, style: { inverse: true } },
        content: "",
    });

    blessed.box({
        parent: screen,
        top: 0,
        left: "50%",
        width: "50%",
        height: 1,
        tags: true,
        content: "{bold} Type   ID        Message{/bold}",
        style: { fg: "white", bg: "black" },
    });

    const errorBox = blessed.box({
        parent: screen,
        top: 1,
        left: "50%",
        width: "50%",
        height: "40%-1",
        border: "line",
        tags: true,
        scrollable: true,
        alwaysScroll: true,
        scrollbar: { ch: " ", style: { inverse: true } },
        content: "",
    });

    blessed.box({
        parent: screen,
        top: "40%",
        left: "50%",
        width: "50%",
        height: 1,
        tags: true,
        content: "{bold} Type   ID        Message{/bold}",
        style: { fg: "white", bg: "black" },
    });

    const warnBox = blessed.box({
        parent: screen,
        top: "40%+1",
        left: "50%",
        width: "50%",
        height: "40%-1",
        border: "line",
        tags: true,
        scrollable: true,
        alwaysScroll: true,
        scrollbar: { ch: " ", style: { inverse: true } },
        content: "",
    });

    const utilsBox = blessed.box({
        parent: screen,
        label: " Utilities ",
        left: "50%",
        width: "50%",
        top: "80%",
        bottom: 0,
        border: "line",
        tags: true,
        content: "L: Open Log File\nQ/Ctrl+C: Exit",
    });

    return { logBox, errorBox, warnBox, utilsBox };
}

/** Appends rows, trims the oldest ones and returns how many were dropped. */
function appendWithLimit(target: string[], rows: string[], limit: number): number {
    target.push(...rows);
    const overflow = target.length - limit;
    if (overflow <= 0) {
        return 0;
    }
    target.splice(0, overflow);
    return overflow;
}

/** Drops the oldest rows once the list exceeds `limit`. */
function trimToLimit(target: string[], limit: number): void {
    const overflow = target.length - limit;
    if (overflow > 0) {
        target.splice(0, overflow);
    }
}

/** Scrolls a panel to its last row, when the method is available. */
function scrollToBottom(box: BlessedBox): void {
    if (typeof box.setScrollPerc === "function") {
        box.setScrollPerc(100);
    }
}

/** Destroys a widget without letting teardown errors escape. */
function safeDestroy(widget: { destroy(): void }): void {
    try {
        widget.destroy();
    } catch {
        // The widget may already be destroyed.
    }
}

/** Focuses the prompt input when the private widget is available. */
function focusPromptInput(prompt: BlessedPrompt): void {
    try {
        const internals: unknown = prompt._;
        if (typeof internals !== "object" || internals === null) {
            return;
        }

        const input: unknown = Reflect.get(internals, "input");
        if (typeof input !== "object" || input === null) {
            return;
        }

        const focus: unknown = Reflect.get(input, "focus");
        if (typeof focus === "function") {
            Reflect.apply(focus, input, []);
        }
    } catch {
        // The private prompt internals are optional; never block the answer.
    }
}

/** Returns the platform command that reveals a file in the file manager. */
function resolveOpenCommand(filePath: string): OpenCommand {
    if (process.platform === "darwin") {
        return { command: "open", args: [filePath] };
    }
    if (process.platform === "win32") {
        return { command: "cmd", args: ["/c", "start", "", filePath] };
    }
    return { command: "xdg-open", args: [filePath] };
}
