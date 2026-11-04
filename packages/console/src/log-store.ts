import type { ConsoleLogEntry, ConsoleLogType, ConsoleStats } from "./types.js";

/** Number of entries kept by default. */
const DEFAULT_CAPACITY = 5000;

/** Every category, used to pre-fill the statistics record. */
const LOG_TYPES: readonly ConsoleLogType[] = [
    "log",
    "info",
    "success",
    "warn",
    "error",
    "debug",
    "trace",
    "ask",
    "answer",
];

/**
 * Bounded in-memory buffer for log entries.
 *
 * The buffer is circular: adding an entry to a full store overwrites the
 * oldest one in constant time, so logging never becomes quadratic.
 *
 * @example
 * ```ts
 * const store = new LogStore(2);
 * store.add(entryA);
 * store.add(entryB);
 * store.add(entryC); // entryA is evicted
 * store.size;        // 2
 * ```
 */
export class LogStore {
    private readonly buffer: Array<ConsoleLogEntry | undefined>;
    private readonly configuredCapacity: number;
    private startIndex = 0;
    private entryCount = 0;

    /**
     * @param maxEntries Maximum number of entries to keep (positive integer).
     * @throws {RangeError} When `maxEntries` is not a positive integer.
     */
    public constructor(maxEntries: number = DEFAULT_CAPACITY) {
        if (!Number.isInteger(maxEntries) || maxEntries < 1) {
            throw new RangeError("The log buffer capacity must be a positive integer.");
        }
        this.configuredCapacity = maxEntries;
        this.buffer = new Array<ConsoleLogEntry | undefined>(maxEntries);
    }

    /**
     * Number of entries currently stored.
     *
     * @example
     * `store.size; // 0`
     */
    public get size(): number {
        return this.entryCount;
    }

    /**
     * Maximum number of entries the buffer can hold.
     *
     * @example
     * `store.capacity; // 5000`
     */
    public get capacity(): number {
        return this.configuredCapacity;
    }

    /**
     * Stores an entry, evicting the oldest one when the buffer is full.
     *
     * @param entry Entry to store.
     *
     * @example
     * ```ts
     * store.add(entry);
     * ```
     */
    public add(entry: ConsoleLogEntry): void {
        if (this.entryCount < this.configuredCapacity) {
            const position = (this.startIndex + this.entryCount) % this.configuredCapacity;
            this.buffer[position] = entry;
            this.entryCount += 1;
            return;
        }

        this.buffer[this.startIndex] = entry;
        this.startIndex = (this.startIndex + 1) % this.configuredCapacity;
    }

    /**
     * Returns a defensive copy of the stored entries, oldest first.
     *
     * @returns A new array that callers may mutate freely.
     *
     * @example
     * ```ts
     * const snapshot = store.entries();
     * ```
     */
    public entries(): ConsoleLogEntry[] {
        const result: ConsoleLogEntry[] = [];
        for (let offset = 0; offset < this.entryCount; offset += 1) {
            const position = (this.startIndex + offset) % this.configuredCapacity;
            const entry = this.buffer[position];
            if (entry !== undefined) {
                result.push(entry);
            }
        }
        return result;
    }

    /**
     * Recomputes the counters from the entries currently stored.
     *
     * @returns Total count and a per-category breakdown.
     *
     * @example
     * ```ts
     * const { total, byType } = store.stats();
     * ```
     */
    public stats(): ConsoleStats {
        const counts: Record<ConsoleLogType, number> = {
            log: 0,
            info: 0,
            success: 0,
            warn: 0,
            error: 0,
            debug: 0,
            trace: 0,
            ask: 0,
            answer: 0,
        };

        for (const entry of this.entries()) {
            counts[entry.type] += 1;
        }

        return {
            total: this.entryCount,
            byType: Object.freeze(counts),
        };
    }

    /**
     * Removes every stored entry while keeping the configured capacity.
     *
     * @example
     * ```ts
     * store.clear();
     * ```
     */
    public clear(): void {
        this.buffer.fill(undefined);
        this.startIndex = 0;
        this.entryCount = 0;
    }
}

/**
 * Re-exported for consumers that need the list of categories at runtime.
 *
 * @example
 * ```ts
 * CONSOLE_LOG_TYPES.includes("error"); // true
 * ```
 */
export const CONSOLE_LOG_TYPES: readonly ConsoleLogType[] = Object.freeze([...LOG_TYPES]);
