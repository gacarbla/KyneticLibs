import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, expectTypeOf, it } from "vitest";
import { ConsoleManager } from "@kyneticweb/console";
import { StrictContainer } from "@kyneticweb/container";
import { Counter } from "@kyneticweb/counter";
import { Parser } from "@kyneticweb/parser";
import { VersionManager } from "@kyneticweb/versions";
import { randomId } from "@kyneticweb/utils";
import { KyneticLibCore } from "../src/index.js";

interface AppContext {
    user: string;
    attempts: number;
}

function createLogPath(): string {
    return join(tmpdir(), `kynetic-core-${randomId()}.log`);
}

describe("KyneticLibCore integration", () => {
    it("composes every published package with full typing", async () => {
        const core = new KyneticLibCore()
            .use("log", new ConsoleManager({ logFilePath: createLogPath() }, null))
            .use("store", new StrictContainer<AppContext>())
            .use("count", new Counter(2))
            .use("text", new Parser())
            .use("version", new VersionManager());

        expectTypeOf(core.console).toEqualTypeOf<ConsoleManager>();
        expectTypeOf(core.container).toEqualTypeOf<StrictContainer<AppContext>>();
        expectTypeOf(core.tool.count).toEqualTypeOf<Counter>();
        expectTypeOf(core.tool.text).toEqualTypeOf<Parser>();
        expectTypeOf(core.tool.version).toEqualTypeOf<VersionManager>();
        expectTypeOf(core.tool.store.get("user")).toEqualTypeOf<string | undefined>();
        expectTypeOf(core.tool.text.parse("string", "number", "1")).toEqualTypeOf<number | undefined>();

        core.tool.store.set("user", "gabriel").set("attempts", 1);
        core.tool.count.increment();
        core.tool.version.setVersion("1.0.0").bump("minor");

        expect(core.tool.count.value).toBe(3);
        expect(core.tool.text.textToNumber("veintiuno")).toBe(21);
        expect(core.tool.version.version).toBe("1.1.0");

        await core.dispose();
        expect(core.size).toBe(0);
    });

    it("keeps the direct properties of the registered kinds", () => {
        const core = new KyneticLibCore().use("attempts", new Counter()).use("retries", new Counter());

        expect(core.counter).toBe(core.tool.attempts);
        expect(core.tool.retries).not.toBe(core.tool.attempts);
        expect(core.size).toBe(2);
    });
});
