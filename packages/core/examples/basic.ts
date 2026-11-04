import { ConsoleManager } from "@kyneticweb/console";
import { StrictContainer } from "@kyneticweb/container";
import { KyneticLibCore } from "@kyneticweb/core";
import { Parser } from "@kyneticweb/parser";

interface AppContext {
    name: string;
    age: number;
    active: boolean;
}

const core = new KyneticLibCore()
    .use("log", new ConsoleManager({ logFilePath: "./logs/example.log" }))
    .use("store", new StrictContainer<AppContext>())
    .use("text", new Parser());

core.console.info("Starting the example");

const age = core.tool.text.parse("string", "number", "30") ?? 0;
core.tool.store.set("name", "Gabriel").set("age", age).set("active", true);

core.console.success(`Name: ${core.tool.store.getOrThrow("name")}`);
core.console.debug(`Age: ${core.tool.store.getOrThrow("age")}`);

await core.dispose();
