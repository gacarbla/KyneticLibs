import { StrictContainer } from "@kyneticweb/container";
import KyneticLibCore from "../src/index";
import ConsoleManager from "@kyneticweb/console";
import Parser from "@kyneticweb/parser";

type ContainerType = {
    name: string;
    age: number;
    active: boolean;
};

const core = new KyneticLibCore()
    .use("container", StrictContainer, {} as ContainerType)
    .use("console", ConsoleManager, {
        color: true,
        dateFormat: 'DD-MM-YYYY HH:mm:ss'
    })
    .use("parser", Parser);

core.console.enableUI().then(async () => {
    core.console.log('Consola iniciada desde KyneticLibCore');
    const name = await core.console.ask('¿Cómo te llamas?');
    core.console.success(`¡Hola, ${name}! La consola está funcionando correctamente.`);
    core.container.set("name", name);
    const ageStr = await core.console.ask('¿Cuántos años tienes?');
    const age = core.parser.parse("string", "number", ageStr) ?? 0;
    core.container.set("age", age);
    core.container.set("active", true);
    core.console.info(`Nombre: ${core.container.get("name")}\nEdad: ${core.container.get("age")}\nActivo: ${core.container.get("active")}`);
});