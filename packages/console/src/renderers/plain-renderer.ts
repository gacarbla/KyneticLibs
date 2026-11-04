import { colorize, formatLogLine } from "../formatters.js";
import type { ConsoleLogEntry, ILogRenderer } from "../types.js";

/** Options accepted by {@link PlainRenderer}. */
export interface PlainRendererOptions {
    /** Enable ANSI colours. Defaults to `true`. */
    readonly color?: boolean;
    /** Timestamp pattern. Defaults to `"YY-MM-DD HH:mm:ss"`. */
    readonly dateFormat?: string;
    /** Stream used for regular entries. Defaults to `process.stdout`. */
    readonly output?: NodeJS.WritableStream;
    /** Stream used for warnings and errors. Defaults to `process.stderr`. */
    readonly errorOutput?: NodeJS.WritableStream;
}

/** Timestamp pattern used when the caller does not provide one. */
const DEFAULT_DATE_FORMAT = "YY-MM-DD HH:mm:ss";

/**
 * Plain text renderer that writes one line per entry.
 *
 * Warnings and errors go to `errorOutput`; every other category goes to
 * `output`. Streams are injectable so the renderer can be tested without a
 * real terminal.
 *
 * @example
 * ```ts
 * const renderer = new PlainRenderer({ color: false });
 * renderer.render(entry);
 * renderer.dispose();
 * ```
 */
export class PlainRenderer implements ILogRenderer {
    private readonly colorEnabled: boolean;
    private readonly dateFormat: string;
    private readonly output: NodeJS.WritableStream;
    private readonly errorOutput: NodeJS.WritableStream;

    /**
     * @param options Output streams, colours and timestamp pattern.
     */
    public constructor(options: PlainRendererOptions = {}) {
        this.colorEnabled = options.color ?? true;
        this.dateFormat = options.dateFormat ?? DEFAULT_DATE_FORMAT;
        this.output = options.output ?? process.stdout;
        this.errorOutput = options.errorOutput ?? process.stderr;
    }

    /**
     * Writes one formatted entry to the appropriate stream.
     *
     * @param entry Entry to display.
     *
     * @example
     * ```ts
     * renderer.render(entry);
     * ```
     */
    public render(entry: ConsoleLogEntry): void {
        const line = colorize(formatLogLine(entry, this.dateFormat), entry.type, this.colorEnabled);
        const destination = entry.type === "error" || entry.type === "warn" ? this.errorOutput : this.output;

        try {
            destination.write(`${line}\n`);
        } catch {
            // A closed or broken stream must not interrupt logging.
        }
    }

    /**
     * Plain output owns no resources, so disposal is a no-op.
     *
     * @example
     * ```ts
     * renderer.dispose();
     * ```
     */
    public dispose(): void {
        // Nothing to release.
    }
}
