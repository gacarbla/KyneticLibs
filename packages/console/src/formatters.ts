import { formatDate } from "@kyneticweb/utils";
import type { ConsoleLogEntry, ConsoleLogType } from "./types.js";

/** ANSI colour prefix for every log category. */
const ANSI_COLORS: Readonly<Record<ConsoleLogType, string>> = {
    log: "\u001b[37m",
    info: "\u001b[36m",
    success: "\u001b[32m",
    warn: "\u001b[33m",
    error: "\u001b[31m",
    debug: "\u001b[34m",
    trace: "\u001b[35m",
    ask: "\u001b[36m",
    answer: "\u001b[32m",
};

/** Sequence that restores the terminal defaults. */
const ANSI_RESET = "\u001b[0m";

/**
 * Builds the single line persisted to disk.
 *
 * The shape is `[date] [TYPE] [id] message`.
 *
 * @param entry Entry to format.
 * @param pattern Date pattern understood by `@kyneticweb/utils`.
 * @returns A single, colourless line.
 *
 * @example
 * ```ts
 * formatLogLine(entry, "YY-MM-DD HH:mm:ss");
 * // "[26-11-04 09:30:00] [INFO] [9f2c1a7b4e] Ready"
 * ```
 */
export function formatLogLine(entry: ConsoleLogEntry, pattern: string): string {
    const timestamp = formatDate(entry.timestamp, pattern);
    return `[${timestamp}] [${entry.type.toUpperCase()}] [${entry.id}] ${entry.message}`;
}

/**
 * Wraps `text` in the ANSI colour assigned to `type`.
 *
 * @param text Text to colour.
 * @param type Category that selects the colour.
 * @param enabled When `false`, the text is returned untouched.
 * @returns The coloured text, or `text` when colours are disabled.
 *
 * @example
 * ```ts
 * colorize("done", "success", true); // "\u001b[32mdone\u001b[0m"
 * colorize("done", "success", false); // "done"
 * ```
 */
export function colorize(text: string, type: ConsoleLogType, enabled: boolean): string {
    if (!enabled) {
        return text;
    }
    return `${ANSI_COLORS[type]}${text}${ANSI_RESET}`;
}
