import KyneticLibCore from "../src/index";
import ConsoleManager from "@kyneticweb/console";

const core = new KyneticLibCore()
    .use("console", ConsoleManager, {
        color: true,
        dateFormat: 'DD-MM-YYYY HH:mm:ss'
    });

core.tool.console.enableUI().then(async () => {
    core.tool.console.log('Consola iniciada desde KyneticLibCore');
    const name = await core.tool.console.ask('¿Cómo te llamas?');
    core.tool.console.success(`¡Hola, ${name}! La consola está funcionando correctamente.`);
});