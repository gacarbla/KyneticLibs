import { createWriteStream, mkdirSync } from "node:fs";
import type { WriteStream } from "node:fs";
import { dirname, resolve } from "node:path";

/** Options accepted by {@link LogWriter}. */
export interface LogWriterOptions {
    /** Append to the file instead of truncating it. Defaults to `false`. */
    readonly append?: boolean;
}

/**
 * Asynchronous line writer backed by a `node:fs` write stream.
 *
 * The stream is created once, so logging does not block the event loop and no
 * new file descriptor is opened per entry.
 *
 * @example
 * ```ts
 * const writer = new LogWriter("./logs/app.log", { append: true });
 * await writer.ready();
 * writer.write("[INFO] ready");
 * await writer.close();
 * ```
 */
export class LogWriter {
    private readonly stream: WriteStream;
    private readonly openPromise: Promise<void>;
    private closed = false;
    private closePromise: Promise<void> | null = null;
    private firstError: Error | null = null;

    /**
     * @param filePath Destination file. Parent directories are created.
     * @param options Stream behaviour.
     * @throws {RangeError} When `filePath` is empty.
     */
    public constructor(filePath: string, options: LogWriterOptions = {}) {
        if (filePath.trim().length === 0) {
            throw new RangeError("The log file path must not be empty.");
        }

        const absolutePath = resolve(filePath);
        mkdirSync(dirname(absolutePath), { recursive: true });

        this.stream = createWriteStream(absolutePath, {
            flags: options.append === true ? "a" : "w",
            encoding: "utf8",
        });

        // A stream error must never crash the process. `waitForOpen` reports
        // the first failure through `ready()`, and this handler retains it for
        // failures that happen after the file was opened.
        this.stream.on("error", (error: Error) => {
            this.firstError ??= error;
        });
        this.openPromise = waitForOpen(this.stream);
        void this.openPromise.catch(() => undefined);
    }

    /**
     * First stream error observed since construction, if any.
     *
     * @example
     * ```ts
     * if (writer.error !== null) console.error(writer.error);
     * ```
     */
    public get error(): Error | null {
        return this.firstError;
    }

    /**
     * Resolves once the underlying stream is open.
     *
     * @returns A promise that rejects when the file cannot be opened.
     *
     * @example
     * ```ts
     * await writer.ready();
     * ```
     */
    public ready(): Promise<void> {
        return this.openPromise;
    }

    /**
     * Queues one line for writing.
     *
     * The method never throws and silently ignores calls made after
     * {@link close}. A newline is appended unless the line already ends with
     * one.
     *
     * @param line Text to persist.
     *
     * @example
     * ```ts
     * writer.write("[INFO] ready");
     * ```
     */
    public write(line: string): void {
        if (this.closed) {
            return;
        }

        try {
            this.stream.write(line.endsWith("\n") ? line : `${line}\n`);
        } catch {
            // File failures must not break logging or rendering.
        }
    }

    /**
     * Flushes pending data and ends the stream.
     *
     * The returned promise is cached, so calling this method more than once is
     * safe and always resolves.
     *
     * @returns A promise resolved when the stream is closed.
     *
     * @example
     * ```ts
     * await writer.close();
     * ```
     */
    public close(): Promise<void> {
        if (this.closePromise !== null) {
            return this.closePromise;
        }

        this.closed = true;
        this.closePromise = new Promise<void>((resolveClose) => {
            let settled = false;

            const finish = (): void => {
                if (settled) {
                    return;
                }
                settled = true;
                this.stream.off("close", finish);
                this.stream.off("error", handleError);
                resolveClose();
            };
            const handleError = (error: Error): void => {
                this.firstError ??= error;
                finish();
            };

            this.stream.once("close", finish);
            this.stream.once("error", handleError);

            try {
                this.stream.end(() => finish());
            } catch (error) {
                this.firstError ??= error instanceof Error ? error : new Error(String(error));
                finish();
            }
        });
        return this.closePromise;
    }
}

/** Resolves when the stream emits `open`, rejects on its first error. */
function waitForOpen(stream: WriteStream): Promise<void> {
    return new Promise<void>((resolveOpen, rejectOpen) => {
        const handleOpen = (): void => {
            cleanup();
            resolveOpen();
        };
        const handleError = (error: Error): void => {
            cleanup();
            rejectOpen(error);
        };
        const cleanup = (): void => {
            stream.off("open", handleOpen);
            stream.off("error", handleError);
        };

        stream.once("open", handleOpen);
        stream.once("error", handleError);
    });
}
