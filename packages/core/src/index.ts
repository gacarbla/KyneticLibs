import ConsoleManager from "@kyneticweb/console";
import { AddAlias } from "./types";
import { StrictContainer } from "@kyneticweb/container";
import { KeyMap } from "@kyneticweb/container/types";
import Parser from "@kyneticweb/parser";

/*
type WithConsole<T> = T & { console: ConsoleManager };
type WithStrictContainer<T, C extends KeyMap> = T & { container: StrictContainer<C> };
*/

export class KyneticLibCore<TAliases = {}> {
    private toolInstances: { [key: string]: any } = {};

    use<K extends string, CT extends KeyMap, Args extends any[]>(
        alias: K,
        ToolClass: typeof StrictContainer,
        containerType: CT,
        ...args: Args
    ): this & { container: StrictContainer<CT> };

    use<K extends string, C extends new (...args: any[]) => ConsoleManager, Args extends any[]>(
        alias: K,
        ToolClass: C,
        ...args: Args
    ): this & { console: ConsoleManager } & { tool: AddAlias<TAliases, K, InstanceType<C>> };

    use<K extends string, C extends new (...args: any[]) => Parser, Args extends any[]>(
        alias: K,
        ToolClass: C,
        ...args: Args
    ): this & { parser: Parser } & { tool: AddAlias<TAliases, K, InstanceType<C>> };

    use<K extends string, C extends new (...args: any[]) => any, Args extends any[]>(
        alias: K,
        ToolClass: C,
        ...args: Args
    ): KyneticLibCore<AddAlias<TAliases, K, InstanceType<C>>>;

    use<K extends string, C extends new (...args: any[]) => any, Args extends any[]>(
        alias: K,
        ToolClass: C,
        ...args: Args
    ): any {
        if (this.toolInstances[alias]) {
            throw new Error(`Tool with alias "${alias}" is already registered.`);
        }
        let instance;
        instance = new ToolClass(...args);
        if (instance instanceof ConsoleManager) {
            Object.defineProperty(this, "console", {
                value: instance,
                writable: false,
                configurable: true,
                enumerable: true
            });
        } else if (instance instanceof StrictContainer) {
            Object.defineProperty(this, "container", {
                value: instance,
                writable: false,
                configurable: true,
                enumerable: true
            });
        } else if (instance instanceof Parser) {
            Object.defineProperty(this, "parser", {
                value: instance,
                writable: false,
                configurable: true,
                enumerable: true
            });
        }
        this.toolInstances[alias] = instance;
        return this;
    }

    get tool(): TAliases {
        return this.toolInstances as TAliases;
    }
}

export default KyneticLibCore;