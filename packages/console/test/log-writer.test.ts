import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LogWriter } from "../src/index.js";

let directory: string;
let filePath: string;

beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "kynetic-console-writer-"));
    filePath = join(directory, "console.log");
});

afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
});

describe("LogWriter", () => {
    it("writes one line per call and flushes on close", async () => {
        const writer = new LogWriter(filePath);
        await writer.ready();
        writer.write("first");
        writer.write("second");
        await writer.close();

        expect(readFileSync(filePath, "utf8")).toBe("first\nsecond\n");
    });

    it("keeps previous content in append mode", async () => {
        const first = new LogWriter(filePath);
        await first.ready();
        first.write("kept");
        await first.close();

        const second = new LogWriter(filePath, { append: true });
        await second.ready();
        second.write("added");
        await second.close();

        expect(readFileSync(filePath, "utf8")).toBe("kept\nadded\n");
    });

    it("truncates previous content when append is disabled", async () => {
        const first = new LogWriter(filePath);
        first.write("old");
        await first.close();

        const second = new LogWriter(filePath);
        second.write("new");
        await second.close();

        expect(readFileSync(filePath, "utf8")).toBe("new\n");
    });

    it("allows close to be called more than once", async () => {
        const writer = new LogWriter(filePath);
        writer.write("line");

        await writer.close();
        await expect(writer.close()).resolves.toBeUndefined();
        expect(readFileSync(filePath, "utf8")).toBe("line\n");
    });

    it("ignores writes made after close", async () => {
        const writer = new LogWriter(filePath);
        writer.write("before");
        await writer.close();
        writer.write("after");

        expect(readFileSync(filePath, "utf8")).toBe("before\n");
    });

    it("rejects an empty file path", () => {
        expect(() => new LogWriter("   ")).toThrow(RangeError);
    });
});
