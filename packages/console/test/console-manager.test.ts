import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConsoleManager } from "../src/index.js";
import type { ConsoleLogEntry, ILogRenderer } from "../src/index.js";

class RecordingRenderer implements ILogRenderer {
    public readonly entries: ConsoleLogEntry[] = [];
    public disposed = false;

    public render(entry: ConsoleLogEntry): void {
        this.entries.push(entry);
    }

    public dispose(): void {
        this.disposed = true;
    }
}

let directory: string;
let filePath: string;

beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "kynetic-console-manager-"));
    filePath = join(directory, "console.log");
});

afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
});

describe("ConsoleManager", () => {
    it("stores, persists and renders every entry", async () => {
        const renderer = new RecordingRenderer();
        const manager = new ConsoleManager({ logFilePath: filePath, ui: "plain" }, renderer);

        manager.log("hello");
        manager.info("information");
        manager.warn("careful");

        expect(manager.getLogs()).toHaveLength(3);
        expect(renderer.entries).toHaveLength(3);

        const stats = manager.getStats();
        expect(stats.total).toBe(3);
        expect(stats.byType.log).toBe(1);
        expect(stats.byType.info).toBe(1);
        expect(stats.byType.warn).toBe(1);
        expect(stats.byType.error).toBe(0);

        await manager.close();

        const content = readFileSync(filePath, "utf8");
        expect(content).toContain("[LOG] [");
        expect(content).toContain("hello");
        expect(content).toContain("[INFO] [");
        expect(content).toContain("information");
        expect(content).toContain("[WARN] [");
        expect(renderer.disposed).toBe(true);
    });

    it("returns a defensive copy of the stored entries", async () => {
        const manager = new ConsoleManager({ logFilePath: filePath }, null);
        manager.info("kept");

        const logs = manager.getLogs();
        logs.length = 0;

        expect(manager.getLogs()).toHaveLength(1);
        await manager.close();
    });

    it("creates different files when uniqueFile is enabled", async () => {
        const first = new ConsoleManager({ logFilePath: filePath, uniqueFile: true }, null);
        first.info("first");
        await first.close();

        const second = new ConsoleManager({ logFilePath: filePath, uniqueFile: true }, null);
        second.info("second");
        await second.close();

        const logFiles = readdirSync(directory).filter((name) => name.endsWith(".log"));
        expect(logFiles).toHaveLength(2);
        expect(new Set(logFiles).size).toBe(2);

        const contents = logFiles.map((name) => readFileSync(join(directory, name), "utf8"));
        expect(contents.some((content) => content.includes("first"))).toBe(true);
        expect(contents.some((content) => content.includes("second"))).toBe(true);
    });

    it("allows close to be called more than once", async () => {
        const manager = new ConsoleManager({ logFilePath: filePath }, null);
        manager.debug("one");

        await manager.close();
        await expect(manager.close()).resolves.toBeUndefined();
    });

    it("rejects an invalid maximum number of entries", () => {
        expect(() => new ConsoleManager({ logFilePath: filePath, maxEntries: 0 })).toThrow(RangeError);
        expect(() => new ConsoleManager({ logFilePath: filePath, maxEntries: 2.5 })).toThrow(RangeError);
    });

    it("rejects an empty date format", () => {
        expect(() => new ConsoleManager({ logFilePath: filePath, dateFormat: "  " })).toThrow(RangeError);
    });

    it("still flushes the log file when the renderer fails to dispose", async () => {
        class BrokenRenderer implements ILogRenderer {
            public render(): void {
                // Nothing to render.
            }

            public dispose(): void {
                throw new Error("renderer exploded");
            }
        }

        const manager = new ConsoleManager({ logFilePath: filePath, ui: "plain" }, new BrokenRenderer());
        manager.info("written before the failure");

        await expect(manager.close()).resolves.toBeUndefined();
        expect(readFileSync(filePath, "utf8")).toContain("written before the failure");
    });

    it("returns an empty answer instead of hanging without a terminal", async () => {
        const manager = new ConsoleManager({ logFilePath: filePath, ui: "plain" }, null);

        await expect(manager.ask("Continue?")).resolves.toBe("");
        await manager.close();
    });

    it("does not start the interface again after close", async () => {
        const manager = new ConsoleManager({ logFilePath: filePath, ui: "blessed" });
        await manager.close();

        await expect(manager.enableUI()).resolves.toBe(manager);
    });
});
