import ConsoleManager from "@kyneticweb/console";
import { BasicContainer, DynamicContainer, StrictContainer } from "@kyneticweb/container";
import Counter from "@kyneticweb/counter";
import Parser from "@kyneticweb/parser";

export type KyneticToolsTypes = typeof ConsoleManager | typeof BasicContainer | typeof DynamicContainer | typeof StrictContainer | typeof Counter | typeof Parser;
export type KyneticTools = ConsoleManager | BasicContainer | DynamicContainer | StrictContainer<any> | Counter | Parser;
export type AddAlias<T, K extends string, V> = T & { [P in K]: V };