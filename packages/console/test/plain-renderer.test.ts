import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import { PlainRenderer } from "../src/index.js";
import type { ConsoleLogEntry, ConsoleLogType } from "../src/index.js";

function makeEntry(type: ConsoleLogType, message: string): ConsoleLogEntry {
    return {
        id: "abc123",
        type,
        message,
        timestamp: new Date(2026, 10, 4, 9, 30, 0),
    };
}

function capture(stream: PassThrough): () => string {
    let output = "";
    stream.setEncoding("utf8");
    stream.on("data", (chunk: string) => {
        output += chunk;
    });
    return () => output;
}

async function flushStreams(): Promise<void> {
    await new Promise<void>((resolve) => setImmediate(resolve));
}

describe("PlainRenderer", () => {
    it("renders entries without ANSI codes when colours are disabled", async () => {
        const output = new PassThrough();
        const errorOutput = new PassThrough();
        const readOutput = capture(output);
        const readError = capture(errorOutput);
        const renderer = new PlainRenderer({ color: false, output, errorOutput });

        renderer.render(makeEntry("info", "ready"));
        renderer.render(makeEntry("warn", "careful"));
        renderer.render(makeEntry("error", "broken"));
        await flushStreams();

        expect(readOutput()).toContain("[INFO] [abc123] ready");
        expect(readOutput()).not.toContain("\u001b[");
        expect(readError()).toContain("[WARN] [abc123] careful");
        expect(readError()).toContain("[ERROR] [abc123] broken");
        expect(readError()).not.toContain("\u001b[");
    });

    it("sends warnings and errors to the error stream only", async () => {
        const output = new PassThrough();
        const errorOutput = new PassThrough();
        const readOutput = capture(output);
        const readError = capture(errorOutput);
        const renderer = new PlainRenderer({ color: false, output, errorOutput });

        renderer.render(makeEntry("warn", "warning only"));
        renderer.render(makeEntry("error", "error only"));
        await flushStreams();

        expect(readOutput()).toBe("");
        expect(readError()).toContain("warning only");
        expect(readError()).toContain("error only");
    });

    it("adds ANSI codes when colours are enabled", async () => {
        const output = new PassThrough();
        const readOutput = capture(output);
        const renderer = new PlainRenderer({ color: true, output, errorOutput: new PassThrough() });

        renderer.render(makeEntry("success", "done"));
        await flushStreams();

        expect(readOutput()).toContain("\u001b[32m");
        expect(readOutput()).toContain("done");
    });

    it("disposes without throwing", () => {
        const renderer = new PlainRenderer({ output: new PassThrough(), errorOutput: new PassThrough() });
        expect(() => renderer.dispose()).not.toThrow();
    });
});
