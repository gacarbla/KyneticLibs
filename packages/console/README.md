# @Kyneticweb/Console

Coloured console logging with file persistence and an optional full-screen `blessed` interface.

## Installation

```bash
npm install @kyneticweb/console
```

The full-screen interface is provided by the optional `blessed` dependency, which is installed
with the package by default but can be omitted:

```bash
npm install blessed
```

## Usage

```typescript
import { ConsoleManager } from "@kyneticweb/console";

const console = new ConsoleManager({
    logFilePath: "./logs/console.log",
    color: true,
    maxEntries: 5000,
});

console.log("Starting system...");
console.info("Loading modules...");
console.success("Modules loaded");
console.warn("DATABASE_MANAGER is outdated");
console.error("Could not load DATABASE_MANAGER");

const answer = await console.ask("Continue? (y/n)");
await console.close();
```

## Full-screen interface

```typescript
const console = new ConsoleManager({ ui: "blessed" });
await console.enableUI();

console.info("The interface now owns the screen");
```

- `q` / `Ctrl+C` closes the interface gracefully.
- `l` opens the log file with the platform file manager.
- `ui: "auto"` falls back to plain output when `blessed` is not installed.
- `ui: "blessed"` throws when the optional package cannot be loaded.
- `ui: "plain"` never loads `blessed`.

Without a terminal, `ask()` resolves to `""` instead of waiting forever. Tests and embedded
processes can inject their own streams with the third constructor argument:

```typescript
const console = new ConsoleManager({ ui: "plain" }, null, { input, output });
```

## Configuration

| Option        | Default                  | Description                                     |
| ------------- | ------------------------ | ----------------------------------------------- |
| `logFilePath` | `"./logs/console.log"`   | File that receives every line.                  |
| `append`      | `false`                  | Append instead of truncating the file.          |
| `uniqueFile`  | `false`                  | Add a timestamp and random suffix to the name.  |
| `dateFormat`  | `"YY-MM-DD HH:mm:ss"`    | Timestamp pattern.                              |
| `color`       | `true`                   | ANSI colours for plain output.                  |
| `maxEntries`  | `5000`                   | In-memory buffer size.                          |
| `ui`          | `"auto"`                 | `"auto"`, `"blessed"` or `"plain"`.             |

## API

### `ConsoleManager`

- `log`, `info`, `success`, `warn`, `error`, `debug`, `trace(message: string): void`
- `ask(question: string): Promise<string>`
- `getLogs(): ConsoleLogEntry[]`
- `getStats(): ConsoleStats`
- `enableUI(): Promise<this>`
- `close(): Promise<void>`

### Building blocks

- `LogStore`: bounded, circular in-memory buffer.
- `LogWriter`: asynchronous stream writer with `ready()`, `write(line)` and `close()`.
- `PlainRenderer`: stdout/stderr output with injectable streams.
- `BlessedRenderer`: incremental full-screen interface.
- `formatLogLine`, `colorize`: shared formatting helpers.
- `DEFAULT_CONSOLE_CONFIG`: the defaults shown above.
- `createConsoleManager`: helper alternative to `new`.
