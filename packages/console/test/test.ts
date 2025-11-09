import ConsoleManager from '../src';

async function init_console() {
    const console = new ConsoleManager({
        logFilePath: './logs/console.log',
        color: true,
        showStats: true,
    });

    await console.enableUI(); // Asegura que la UI blessed esté lista

    console.log('Iniciando sistema...')
    console.info('Cargando módulos...');
    console.success('Módulos cargados correctamente');
    console.warn('El módulo DATABASE_MANAGER está usando una versión obsoleta.');
    let answered = false;
    while (!answered) {
        const ans = await console.ask('¿Estás seguro de que deseas continuar? (s/n)');
        switch (ans.toLowerCase()) {
            case 's':
            case 'si':
            case 'y':
            case 'yes':
                console.info('Continuando con la operación...');
                console.error('Imposible cargar el módulo DATABASE_MANAGER.');
                console.success('Aplicación iniciada correctamente con 1 error.');
                answered = true;
                break;
            case 'n':
            case 'no':
                console.error('Operación cancelada por el usuario.');
                console.info('Saliendo del sistema...');
                process.exit(0);
            default:
                console.warn('Respuesta no válida, intentando de nuevo en 2 segundos...');
                await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

// Inicialización de la consola
init_console();

// ...

// La ejecución continúa, la consola ocupa un hilo separado