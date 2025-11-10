// =[ EN ]===========================================================================
//
//  CONSOLEMANAGER
//  A simple console manager class.
//
//  Developed by gacarbla
//  v1.2.0
//
// =[ ES ]===========================================================================
//
//  CONSOLEMANAGER
//  Clase para gestionar la consola de forma sencilla.
//
//  Desarrollado por gacarbla
//  v1.2.0
//
// =[ GL ]===========================================================================
//
//  CONSOLEMANAGER
//  Clase para xestionar a consola de forma sinxela.
//
//  Desenrolado por gacarbla
//  v1.2.0
//
// ==================================================================================


import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { ConsoleConfig, ConsoleLogType, ConsoleLogEntry } from './types';

const COLORS = {
    log: '\x1b[37m',
    info: '\x1b[36m',
    success: '\x1b[32m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
    reset: '\x1b[0m',
    debug: '\x1b[34m',
    trace: '\x1b[35m',
    ask: '\x1b[36m',
    answer: '\x1b[32m'
};

function formatDate(date: Date, format: string) {
    return format
        .replace('YYYY', date.getFullYear().toString())
        .replace('YY', date.getFullYear().toString().slice(-2))
        .replace('MM', String(date.getMonth() + 1).padStart(2, '0'))
        .replace('M', String(date.getMonth() + 1))
        .replace('DD', String(date.getDate()).padStart(2, '0'))
        .replace('D', String(date.getDate()))
        .replace('HH', String(date.getHours()).padStart(2, '0'))
        .replace('H', String(date.getHours()))
        .replace('mm', String(date.getMinutes()).padStart(2, '0'))
        .replace('m', String(date.getMinutes()))
        .replace('ss', String(date.getSeconds()).padStart(2, '0'))
        .replace('s', String(date.getSeconds()));
}

function randomId() {
    return Math.random().toString(36).slice(2, 10);
}

function ensureDirExists(filePath: string) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function uniqueLogFileName(basePath: string) {
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
    const rand = Math.random().toString(36).slice(2, 7);
    const ext = path.extname(basePath) || '.log';
    const base = path.basename(basePath, ext);
    const dir = path.dirname(basePath);
    return path.join(dir, `${base}-${stamp}-${rand}${ext}`);
}

let ConsoleBlessedUI: any = null;

export class ConsoleManager {
    private config: ConsoleConfig;
    private logFile: string;
    private logs: ConsoleLogEntry[] = [];
    private blessedUI: any = null;
    private static blessedUILoaded = false;

    constructor(config: Partial<ConsoleConfig> = {}) {
        const defaultConfig: ConsoleConfig = {
            logFilePath: './logs/console.log',
            dateFormat: 'YY-MM-DD HH:mm:ss',
            color: true,
            showStats: true,
        };
        this.config = { ...defaultConfig, ...config };
        const logFileAbs = path.resolve(this.config.logFilePath);
        ensureDirExists(logFileAbs);
        this.logFile = uniqueLogFileName(logFileAbs);
        fs.writeFileSync(this.logFile, '', 'utf-8');


    }

    async enableUI(): Promise<this> {
        if (!ConsoleManager.blessedUILoaded) {
            try {
                const mod = await import('./blessedUI.js');
                ConsoleBlessedUI = mod.ConsoleBlessedUI;
                ConsoleManager.blessedUILoaded = true;
            } catch (e) {
                this.warn('No se pudo cargar la interfaz blessedUI. ¿Está instalado blessed?');
            }
        }
        if (ConsoleBlessedUI && !this.blessedUI) {
            this.blessedUI = new ConsoleBlessedUI(this.logFile);
            for (const log of this.logs) this.blessedUI.addLog(log);
        }
        return this
    }

    private writeLog(type: ConsoleLogType, message: string) {
        const entry: ConsoleLogEntry = {
            type,
            message,
            timestamp: new Date(),
            id: randomId(),
        };
        this.logs.push(entry);
        const line = `[${formatDate(entry.timestamp, this.config.dateFormat!)}] [${entry.id}] [${type.toUpperCase()}] ${message}\n`;
        fs.appendFileSync(this.logFile, line, 'utf-8');
        if (this.blessedUI) this.blessedUI.addLog(entry); else this.display(entry);
    }

    private display(entry: ConsoleLogEntry) {
        const color = this.config.color ? COLORS[entry.type] : '';
        const reset = this.config.color ? COLORS.reset : '';
        const out = `${color}[${formatDate(entry.timestamp, this.config.dateFormat!)}] [${entry.type.toUpperCase()}] [${entry.id}]${reset} ${entry.message}`;
        if (entry.type === 'error') {
            console.error(out);
        } else if (entry.type === 'warn') {
            console.warn(out);
        } else {
            console.log(out);
        }
    }

    log(message: string) {
        this.writeLog('log', message);
    }
    info(message: string) {
        this.writeLog('info', message);
    }
    success(message: string) {
        this.writeLog('success', message);
    }
    warn(message: string) {
        this.writeLog('warn', message);
    }
    error(message: string) {
        this.writeLog('error', message);
    }

    async ask(question: string): Promise<string> {
        this.writeLog('ask', `${question}`);
        await this.enableUI();
        if (this.blessedUI && typeof this.blessedUI.ask === 'function') {
            const answer = await this.blessedUI.ask(question);
            this.writeLog('answer', `${answer}`);
            return answer;
        }
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        return new Promise((resolve) => {
            rl.question(`${question} `, (answer) => {
                rl.close();
                this.writeLog('answer', `${answer}`);
                resolve(answer);
            });
        });
    }

    getLogs(): ConsoleLogEntry[] {
        return [...this.logs];
    }
}

export default ConsoleManager;
