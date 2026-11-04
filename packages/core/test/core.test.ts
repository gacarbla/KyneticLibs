import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { KyneticLibCore, RESERVED_TOOL_KINDS, type Tool } from "../src/index.js";

class FakeConsole implements Tool {
    public readonly toolKind = "console" as const;
    public readonly messages: string[] = [];
    public disposed = false;

    public log(message: string): void {
        this.messages.push(message);
    }

    public dispose(): void {
        this.disposed = true;
    }
}

class FakeContainer implements Tool {
    public readonly toolKind = "container" as const;
    public closed = false;

    public close(): void {
        this.closed = true;
    }
}

class AnonymousTool {
    public readonly name = "anonymous";
}

describe("KyneticLibCore", () => {
    it("registers tools by alias and exposes them by toolKind", () => {
        const console = new FakeConsole();
        const core = new KyneticLibCore().use("log", console);

        expect(core.has("log")).toBe(true);
        expect(core.get("log")).toBe(console);
        expect(core.tool.log).toBe(console);
        expect(core.console).toBe(console);
    });

    it("infers the alias and direct property types", () => {
        const core = new KyneticLibCore().use("log", new FakeConsole());

        expectTypeOf(core.tool.log).toEqualTypeOf<FakeConsole>();
        expectTypeOf(core.console).toEqualTypeOf<FakeConsole>();
        expectTypeOf(core.size).toEqualTypeOf<number>();
    });

    it("keeps accumulating tools while chaining", () => {
        const core = new KyneticLibCore().use("log", new FakeConsole()).use("store", new FakeContainer());

        expect(core.size).toBe(2);
        expect(core.aliases()).toEqual(["log", "store"]);
        expectTypeOf(core.container).toEqualTypeOf<FakeContainer>();
        expectTypeOf(core.tool.store).toEqualTypeOf<FakeContainer>();
    });

    it("rejects duplicated aliases", () => {
        const core = new KyneticLibCore().use("log", new FakeConsole());

        expect(() => core.use("log", new FakeConsole())).toThrow('already registered with the alias "log"');
    });

    it("reports unknown aliases with a readable error", () => {
        const core = new KyneticLibCore();

        expect(core.has("missing")).toBe(false);
        expect(() => core.get("missing")).toThrow('No tool is registered with the alias "missing".');
    });

    it("removes a tool and hides its direct property", () => {
        const console = new FakeConsole();
        const core = new KyneticLibCore().use("log", console);

        expect(core.remove("log")).toBe(true);
        expect(core.remove("log")).toBe(false);
        expect(core.has("log")).toBe(false);
        expect(core.console).toBeUndefined();
    });

    it("promotes another tool with the same kind when the exposed one is removed", () => {
        const first = new FakeConsole();
        const second = new FakeConsole();
        const core = new KyneticLibCore().use("first", first).use("second", second);

        expect(core.console).toBe(first);

        core.remove("first");
        expect(core.console).toBe(second);
        expect(core.tool.second).toBe(second);

        core.remove("second");
        expect(core.console).toBeUndefined();
    });

    it("ignores tools without toolKind", () => {
        const core = new KyneticLibCore().use("anonymous", new AnonymousTool());

        expect(core.tool.anonymous).toBeInstanceOf(AnonymousTool);
        expect(Object.getOwnPropertyDescriptor(core, "anonymous")).toBeUndefined();
    });

    it("never shadows core members with a reserved toolKind", () => {
        class ReservedTool implements Tool {
            public readonly toolKind = RESERVED_TOOL_KINDS[0] as string;
        }

        const core = new KyneticLibCore().use("reserved", new ReservedTool());

        expect(core.tool.reserved).toBeInstanceOf(ReservedTool);
        expect(Object.getOwnPropertyDescriptor(core, "tool")).toBeUndefined();
        expect(core.tool).not.toBeInstanceOf(ReservedTool);
    });

    it("supports dangerous looking aliases", () => {
        const console = new FakeConsole();
        const core = new KyneticLibCore().use("__proto__", console);

        expect(core.has("__proto__")).toBe(true);
        expect(core.get("__proto__")).toBe(console);
    });

    it("disposes every tool, preferring dispose over close", async () => {
        const console = new FakeConsole();
        const container = new FakeContainer();
        const core = new KyneticLibCore().use("log", console).use("store", container);

        await core.dispose();

        expect(console.disposed).toBe(true);
        expect(container.closed).toBe(true);
        expect(core.size).toBe(0);
        expect(core.console).toBeUndefined();
    });

    it("disposes a tool registered under several aliases only once", async () => {
        const console = new FakeConsole();
        const spy = vi.spyOn(console, "dispose");
        const core = new KyneticLibCore().use("first", console).use("second", console);

        await core.dispose();

        expect(spy).toHaveBeenCalledTimes(1);
    });

    it("returns a snapshot from the tool getter", () => {
        const console = new FakeConsole();
        const core = new KyneticLibCore().use("log", console);

        const snapshot = core.tool;
        Reflect.deleteProperty(snapshot, "log");

        expect(core.tool.log).toBe(console);
    });

    it("disposes everything even when one tool fails", async () => {
        const failing: Tool = {
            toolKind: "failing",
            dispose: vi.fn(() => {
                throw new Error("boom");
            }),
        };
        const console = new FakeConsole();
        const core = new KyneticLibCore().use("failing", failing).use("log", console);

        await expect(core.dispose()).rejects.toThrow(AggregateError);
        expect(console.disposed).toBe(true);
    });
});
