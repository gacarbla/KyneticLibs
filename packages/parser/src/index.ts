import * as path from 'path';
import yaml from 'js-yaml';
import * as fs from 'fs';
import { InputFormat, InputType, OutputFormat, OutputType } from './types';

export class Parser {
    constructor() { }

    parse<F extends InputFormat, O extends OutputFormat<F>>(
        inputFormat: F,
        outputFormat: O,
        input: InputType<F>
    ): OutputType<O> | void {
        if (inputFormat === 'string') {
            if (outputFormat === 'number') return Number(input) as OutputType<O>;
            if (outputFormat === 'boolean') return ((input === 'true' || input === '1') ? true : false) as OutputType<O>;
            if (outputFormat === 'date') return new Date(input as string) as OutputType<O>;
            if (outputFormat === 'object') {
                try {
                    return JSON.parse(input as string) as OutputType<O>;
                } catch {
                    return undefined;
                }
            }
            if (outputFormat === 'yaml') return this.parseYAML(input as string) as OutputType<O>;
            if (outputFormat === 'string') return input as unknown as OutputType<O>;
        }

        if (inputFormat === 'stringDate') {
            if (outputFormat === 'date') return new Date(input as string) as OutputType<O>;
            if (outputFormat === 'string') return input as unknown as OutputType<O>;
            if (outputFormat === 'number') return new Date(input as string).getTime() as OutputType<O>;
        }

        if (inputFormat === 'stringDatePlaceholder') {
            if (outputFormat === 'function') {
                const func = (date: Date): string => {
                    let result = input as string;
                    const YYYY = date.getFullYear().toString().padStart(4, '0');
                    const YY = date.getFullYear().toString().slice(-2);
                    const MM = (date.getMonth() + 1).toString().padStart(2, '0');
                    const M = (date.getMonth() + 1).toString();
                    const DD = date.getDate().toString().padStart(2, '0');
                    const D = date.getDate().toString();
                    const HH = date.getHours().toString().padStart(2, '0');
                    const H = date.getHours().toString();
                    const mm = date.getMinutes().toString().padStart(2, '0');
                    const m = date.getMinutes().toString();
                    const ss = date.getSeconds().toString().padStart(2, '0');
                    const s = date.getSeconds().toString();
                    result = result.replace('YYYY', YYYY)
                        .replace('YY', YY)
                        .replace('MM', MM)
                        .replace('M', M)
                        .replace('DD', DD)
                        .replace('D', D)
                        .replace('HH', HH)
                        .replace('H', H)
                        .replace('mm', mm)
                        .replace('m', m)
                        .replace('ss', ss)
                        .replace('s', s);
                    return result;
                };
                return func as OutputType<O>;
            }
        }

        if (inputFormat === 'number') {
            if (outputFormat === 'string') return String(input) as OutputType<O>;
            if (outputFormat === 'boolean') return (!!input) as OutputType<O>;
            if (outputFormat === 'number') return input as unknown as OutputType<O>;
        }

        if (inputFormat === 'boolean') {
            if (outputFormat === 'string') return (input ? 'true' : 'false') as OutputType<O>;
            if (outputFormat === 'number') return (input ? 1 : 0) as OutputType<O>;
            if (outputFormat === 'boolean') return input as unknown as OutputType<O>;
        }

        if (inputFormat === 'date') {
            if (outputFormat === 'string') return (input as Date).toISOString() as OutputType<O>;
            if (outputFormat === 'number') return (input as Date).getTime() as OutputType<O>;
            if (outputFormat === 'date') return input as unknown as OutputType<O>;
        }

        if (inputFormat === 'object') {
            if (outputFormat === 'string') return JSON.stringify(input) as OutputType<O>;
            if (outputFormat === 'object') return input as unknown as OutputType<O>;
            if (outputFormat === 'yaml') return this.stringifyYAML(input) as OutputType<O>;
        }

        if (inputFormat === 'json') {
            const filePath = path.resolve(String(input));
            if (!fs.existsSync(filePath)) return undefined;
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const parsed = JSON.parse(fileContent);
            if (outputFormat === 'object') {
                return parsed as OutputType<O>;
            }
            if (outputFormat === 'string') return JSON.stringify(parsed) as unknown as OutputType<O>;
        }

        if (inputFormat === 'yaml') {
            const filePath = path.resolve(String(input));
            if (!fs.existsSync(filePath)) return undefined;
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const parsed = yaml.load(fileContent) as Record<string, any>;
            if (outputFormat === 'object' || outputFormat === 'yaml') {
                return parsed as OutputType<O>;
            }
            if (outputFormat === 'string') return JSON.stringify(parsed) as unknown as OutputType<O>;
        }

        return undefined;
    }

    private parseYAML(yamlStr: string): Record<string, any> {
        return yaml.load(yamlStr) as Record<string, any>;
    }
    private stringifyYAML(obj: any): string {
        return yaml.dump(obj);
    }

    textToNumber(text: string, lang: 'es-ES' | 'en-US' | 'gl-ES'): number {
        var units: Record<string, number> = {},
            tens: Record<string, number> = {},
            hundreds: Record<string, number> = {},
            thousands: Record<string, number> = {},
            connectors: string[] = [];

        try {
            const imported = require(`./locales/${lang}.json`);
            units = imported.units;
            tens = imported.tens;
            hundreds = imported.hundreds;
            thousands = imported.thousands;
            connectors = imported.connectors as string[];
        } catch (e) {
            throw new Error(`Error loading locale data for ${lang}: ${e}`);
        }

        if (!units || !tens || !hundreds || !thousands || !connectors) {
            throw new Error('Locale data not loaded');
        }

        let total = 0;
        let tokens = text.toLowerCase().trim().split(/\s+/).filter(token => !connectors.includes(token));
        let current = 0;
        for (let token of tokens) {
            if (units[token] !== undefined) {
                current += units[token];
            } else if (tens[token] !== undefined) {
                current += tens[token];
            } else if (hundreds[token] !== undefined) {
                current += hundreds[token];
            } else if (thousands[token] !== undefined) {
                if (current === 0) current = 1;
                total += current * thousands[token];
                current = 0;
            }
        }
        total += current;
        return total;
    }
}

export default Parser;

