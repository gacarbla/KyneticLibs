import blessed from 'blessed';
import { ConsoleLogEntry } from './types';

export class ConsoleBlessedUI {
    private screen: blessed.Widgets.Screen;
    private logBox: blessed.Widgets.BoxElement;
    private logHeaderBox: blessed.Widgets.BoxElement;
    private errorBoxHeader: blessed.Widgets.BoxElement;
    private warnBoxHeader: blessed.Widgets.BoxElement;
    private errorBox: blessed.Widgets.BoxElement;
    private warnBox: blessed.Widgets.BoxElement;
    private utilsBox: blessed.Widgets.BoxElement;
    private logs: ConsoleLogEntry[] = [];
    private logFilePath: string;
    private ready: boolean = false;
    public isReady = async (): Promise<void> => {
        if (this.ready) return;
    };
    constructor(logFilePath: string = './logs/console.log') {
        this.logFilePath = logFilePath;
        this.screen = blessed.screen({ smartCSR: true, title: 'ConsoleManager' });
        this.logHeaderBox = blessed.box({
            parent: this.screen,
            top: 0,
            left: 0,
            width: '50%',
            height: 1,
            tags: true,
            content: '{bold} Type     ID         Message{/bold}',
            style: { fg: 'white', bg: 'black' },
        });
        this.logBox = blessed.box({
            parent: this.screen,
            label: '',
            top: 1,
            left: 0,
            width: '50%',
            height: '100%-1',
            border: 'line',
            tags: true,
            scrollable: true,
            alwaysScroll: true,
            mouse: true,
            keys: true,
            vi: false,
            scrollback: 2000,
            scrollbar: { 
                ch: ' ', 
                track: {
                    bg: 'grey'
                },
                style: { 
                    inverse: true 
                } 
            },
            content: '',
        });
        this.logBox.key(['up', 'k'], () => {
            if (!this.asking) {
                this.logBox.scroll(-1);
                this.screen.render();
            }
        });
        this.logBox.key(['down', 'j'], () => {
            if (!this.asking) {
                this.logBox.scroll(1);
                this.screen.render();
            }
        });
        this.logBox.key(['pageup', 'C-b'], () => {
            if (!this.asking) {
                const height = (this.logBox.height as number) || 10;
                this.logBox.scroll(-(height - 2));
                this.screen.render();
            }
        });
        this.logBox.key(['pagedown', 'C-f', 'space'], () => {
            if (!this.asking) {
                const height = (this.logBox.height as number) || 10;
                this.logBox.scroll(height - 2);
                this.screen.render();
            }
        });
        this.logBox.key(['home', 'g'], () => {
            if (!this.asking && typeof this.logBox.setScrollPerc === 'function') {
                this.logBox.setScrollPerc(0);
                this.screen.render();
            }
        });
        this.logBox.key(['end', 'G'], () => {
            if (!this.asking && typeof this.logBox.setScrollPerc === 'function') {
                this.logBox.setScrollPerc(100);
                this.screen.render();
            }
        });
        
        this.logBox.focus();
        this.screen.on('render', () => {
            if (!this.asking && this.logBox && typeof this.logBox.focus === 'function') {
                this.logBox.focus();
            }
        });
        this.errorBoxHeader = blessed.box({
            parent: this.screen,
            top: 0,
            left: '50%',
            width: '50%',
            height: 1,
            tags: true,
            content: '{bold} Type   ID        Message{/bold}',
            style: { fg: 'white', bg: 'black' },
        });
        this.errorBox = blessed.box({
            parent: this.screen,
            top: 1,
            left: '50%',
            width: '50%',
            height: '40%-1',
            border: 'line',
            tags: true,
            scrollable: true,
            alwaysScroll: true,
            scrollbar: { ch: ' ', style: { inverse: true } },
        });
        this.warnBoxHeader = blessed.box({
            parent: this.screen,
            top: '40%',
            left: '50%',
            width: '50%',
            height: 1,
            tags: true,
            content: '{bold} Type   ID        Message{/bold}',
            style: { fg: 'white', bg: 'black' },
        });
        this.warnBox = blessed.box({
            parent: this.screen,
            top: '40%+1',
            left: '50%',
            width: '50%',
            height: '40%-1',
            border: 'line',
            tags: true,
            scrollable: true,
            alwaysScroll: true,
            scrollbar: { ch: ' ', style: { inverse: true } },
        });
        this.utilsBox = blessed.box({
            parent: this.screen,
            label: ' Utilities ',
            left: '50%',
            width: '50%',
            top: '80%',
            bottom: 0,
            border: 'line',
            tags: true,
            content: '',
        });
        this.utilsBox.setContent(
            'L: Open Log File\n' +
            'Q/Ctrl+C: Exit'
        );
        this.handleKeys = async (_: string, key: blessed.Widgets.Events.IKeyEventArg) => {
            if (!key || typeof key !== 'object') return;
            if (this.asking) return;
            
            try {
                if (key.name === 'l' && !key.ctrl && !key.meta) {
                    const { exec } = (await import('child_process'));
                    exec(`start "" "${this.logFilePath}"`);
                }
                else if (key.full && ['q', 'C-c'].includes(key.full)) {
                    await this.confirmExit();
                }
            } catch (error) {
                if (this.logBox && typeof this.logBox.focus === 'function') {
                    this.logBox.focus();
                }
                this.screen.render();
            }
        };
        this.screen.on('keypress', this.handleKeys);
        this.screen.render();
        this.ready = true;

        void this.logHeaderBox;
        void this.errorBoxHeader;
        void this.warnBoxHeader;
    }
    addLog(entry: ConsoleLogEntry) {
        this.logs.push(entry);
        this.updateLogBox();
        this.updateErrorWarnBoxes();
        this.screen.render();
    }
    private updateLogBox() {
    const pad = (str: string, len: number) => str.padEnd(len, ' ');
    const typePad = 9, idPad = 11;
    const leftPad = ' ';
    const rightMargin = 2;
    const boxWidth = (this.logBox.width as number) || 80;
    const msgColStart = typePad + idPad + leftPad.length;
    const msgColWidth = Math.max(10, boxWidth - msgColStart - rightMargin);
    const visibleRows = (this.logBox.height as number) - 2;
        function wrapWords(text: string, width: number): string[] {
            const words = text.split(/(\s+)/);
            const lines: string[] = [];
            let line = '';
            for (const word of words) {
                if (word === '\n') {
                    lines.push(line);
                    line = '';
                } else if ((line + word).length > width - 1) {
                    if (line) lines.push(line);
                    if (word.length > width - 1) {
                        let w = word;
                        while (w.length > width - 1) {
                            lines.push(w.slice(0, width - 1));
                            w = w.slice(width - 1);
                        }
                        line = w;
                    } else {
                        line = word.trimStart();
                    }
                } else {
                    line += word;
                }
            }
            if (line) lines.push(line);
            return lines;
        }
        let allRows: string[] = [];
        for (let i = 0; i < this.logs.length; i++) {
            const l = this.logs[i];
            const color = this.getColor(l.type);
            const msgLines = l.message.split(/\r?\n/);
            let first = true;
            for (const msgLine of msgLines) {
                const wrapped = wrapWords(msgLine, msgColWidth);
                wrapped.forEach((part, _) => {
                    if (first) {
                        allRows.push(`${leftPad}${color}${pad(l.type.toUpperCase(),typePad)}{white-fg}${pad(l.id,idPad)}${part}{/}`);
                        first = false;
                    } else {
                        allRows.push(`${leftPad}{white-fg}${' '.repeat(typePad)}${' '.repeat(idPad)}${part}{/}`);
                    }
                });
            }
        }
        allRows = allRows.slice(-visibleRows);
        this.logBox.setContent(allRows.join('\n') || 'No logs yet');
    }
    private updateErrorWarnBoxes() {
        const pad = (str: string, len: number) => str.padEnd(len, ' ');
        const typePad = 7, idPad = 10;
        const leftPad = ' ';
        const rightMargin = 2;
        const errorBoxWidth = (this.errorBox.width as number) || 40;
        const warnBoxWidth = (this.warnBox.width as number) || 40;
        const msgColStart = typePad + idPad + leftPad.length;
        const errorMsgColWidth = Math.max(10, errorBoxWidth - msgColStart - rightMargin);
        const warnMsgColWidth = Math.max(10, warnBoxWidth - msgColStart - rightMargin);
        const errorVisibleRows = (this.errorBox.height as number) - 2;
        const warnVisibleRows = (this.warnBox.height as number) - 2;
        function wrapWords(text: string, width: number): string[] {
            const words = text.split(/(\s+)/);
            const lines: string[] = [];
            let line = '';
            for (const word of words) {
                if (word === '\n') {
                    lines.push(line);
                    line = '';
                } else if ((line + word).length > width - 1) {
                    if (line) lines.push(line);
                    if (word.length > width - 1) {
                        let w = word;
                        while (w.length > width - 1) {
                            lines.push(w.slice(0, width - 1));
                            w = w.slice(width - 1);
                        }
                        line = w;
                    } else {
                        line = word.trimStart();
                    }
                } else {
                    line += word;
                }
            }
            if (line) lines.push(line);
            return lines;
        }
        let errorRows: string[] = [];
        const errorLogs = this.logs.filter(l => l.type === 'error');
        for (let i = 0; i < errorLogs.length; i++) {
            const l = errorLogs[i];
            const color = this.getColor(l.type);
            const msgLines = l.message.split(/\r?\n/);
            let first = true;
            for (const msgLine of msgLines) {
                const wrapped = wrapWords(msgLine, errorMsgColWidth);
                wrapped.forEach((part, _) => {
                    if (first) {
                        errorRows.push(`${leftPad}${color}${pad(l.type,typePad)}{white-fg}${pad(l.id,idPad)}${part}{/}`);
                        first = false;
                    } else {
                        errorRows.push(`${leftPad}{white-fg}${' '.repeat(typePad)}${' '.repeat(idPad)}${part}{/}`);
                    }
                });
            }
        }
        errorRows = errorRows.slice(-errorVisibleRows);
        this.errorBox.setContent(errorRows.length ? errorRows.join('\n') : 'No recent errors');
        let warnRows: string[] = [];
        const warnLogs = this.logs.filter(l => l.type === 'warn');
        for (let i = 0; i < warnLogs.length; i++) {
            const l = warnLogs[i];
            const color = this.getColor(l.type);
            const msgLines = l.message.split(/\r?\n/);
            let first = true;
            for (const msgLine of msgLines) {
                const wrapped = wrapWords(msgLine, warnMsgColWidth);
                wrapped.forEach((part, _) => {
                    if (first) {
                        warnRows.push(`${leftPad}${color}${pad(l.type,typePad)}{white-fg}${pad(l.id,idPad)}${part}{/}`);
                        first = false;
                    } else {
                        warnRows.push(`${leftPad}{white-fg}${' '.repeat(typePad)}${' '.repeat(idPad)}${part}{/}`);
                    }
                });
            }
        }
        warnRows = warnRows.slice(-warnVisibleRows);
        this.warnBox.setContent(warnRows.length ? warnRows.join('\n') : 'No recent warnings');
    }
    private getColor(type: string) {
        switch (type) {
            case 'info': return '{cyan-fg}';
            case 'success': return '{green-fg}';
            case 'warn': return '{yellow-fg}';
            case 'error': return '{red-fg}';
            default: return '{white-fg}';
        }
    }
    private asking = false;
    private handleKeys: ((ch: string, key: blessed.Widgets.Events.IKeyEventArg) => void) | undefined;
    private async confirmExit(): Promise<void> {
        this.asking = true;
        return new Promise((resolve) => {
            const overlay = blessed.box({
                parent: this.screen,
                top: 'center',
                left: 'center',
                width: '50%',
                height: 7,
                border: 'line',
                style: {
                    border: { fg: 'red' },
                    bg: 'black'
                },
                tags: true,
                content: '\n  {bold}Are you sure you want to exit?{/bold}\n\n  Press {green-fg}Y{/green-fg} or {green-fg}Enter{/green-fg} to confirm\n  Press {red-fg}N{/red-fg} or {red-fg}ESC{/red-fg} to cancel\n\n',
                keys: true,
                vi: false,
                mouse: true
            });
            overlay.focus();
            this.screen.render();
            const keyHandler = (_: string, key: blessed.Widgets.Events.IKeyEventArg) => {
                if (!key) return;
                const keyName = (key.name || '').toLowerCase();
                const keyFull = (key.full || '').toLowerCase();
                if (keyName === 's' || keyName === 'y' || keyFull === 'enter') {
                    cleanup();
                    process.exit(0);
                }
                else if (keyName === 'n' || keyName === 'escape' || keyFull === 'escape') {
                    cleanup();
                    resolve();
                }
            };
            const cleanup = () => {
                overlay.removeListener('keypress', keyHandler);
                overlay.destroy();
                this.asking = false;
                if (this.logBox && typeof this.logBox.focus === 'function') {
                    this.logBox.focus();
                }
                this.screen.render();
            };
            overlay.on('keypress', keyHandler);
        });
    }
    async ask(question: string): Promise<string> {
        await this.isReady();
        this.asking = true;
        return new Promise((resolve) => {
            const prompt = blessed.prompt({
                parent: this.screen,
                border: 'line',
                height: 7,
                width: '50%',
                top: 'center',
                left: 'center',
                tags: true,
                keys: true,
                vi: true,
                mouse: true,
                style: { border: { fg: 'cyan' } }
            });
            if (this.screen.program) {
                (this.screen.program as any).rawMode = true;
            }
            if (prompt._.input && typeof prompt._.input.focus === 'function') {
                prompt._.input.focus();
            }
            this.screen.render();
            prompt.input(question, '', (_: any, value: string) => {
                prompt.destroy();
                this.asking = false;
                if (this.logBox && typeof this.logBox.focus === 'function') {
                    this.logBox.focus();
                }
                this.screen.render();
                resolve(value || '');
            });
        });
    }
}

export default ConsoleBlessedUI;
