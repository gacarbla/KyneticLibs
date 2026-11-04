// =[ EN ]===========================================================================
//
//  CONSOLE
//  Coloured console logging with file persistence and an optional blessed UI.
//
//  Developed by gacarbla
//  v0.2.0
//
// =[ ES ]===========================================================================
//
//  CONSOLE
//  Registro de consola con color, persistencia en fichero y UI blessed opcional.
//
//  Desarrollado por gacarbla
//  v0.2.0
//
// =[ GL ]===========================================================================
//
//  CONSOLE
//  Rexistro de consola con cor, persistencia en ficheiro e UI blessed opcional.
//
//  Desenrolado por gacarbla
//  v0.2.0
//
// ==================================================================================

export { ConsoleManager, createConsoleManager } from "./console-manager.js";
export { colorize, formatLogLine } from "./formatters.js";
export { CONSOLE_LOG_TYPES, LogStore } from "./log-store.js";
export { LogWriter } from "./log-writer.js";
export type { LogWriterOptions } from "./log-writer.js";
export { BlessedRenderer } from "./renderers/blessed-renderer.js";
export { PlainRenderer } from "./renderers/plain-renderer.js";
export type { PlainRendererOptions } from "./renderers/plain-renderer.js";
export { DEFAULT_CONSOLE_CONFIG } from "./types.js";
export type { ConsoleConfig, ConsoleLogEntry, ConsoleLogType, ConsoleStats, ILogRenderer } from "./types.js";
