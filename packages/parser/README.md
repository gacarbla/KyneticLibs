# `@kyneticweb/parser`

Type-safe conversions between strings, numbers, booleans, dates, objects, JSON, YAML and
numbers written as words.

## Installation

```bash
npm install @kyneticweb/parser
```

## Usage

```ts
import { Parser } from "@kyneticweb/parser";

const parser = new Parser();

parser.parse("string", "number", "12");        // 12
parser.parse("string", "boolean", "yes");      // true
parser.parse("string", "date", "2026-11-04");  // Date
parser.parse("object", "yaml", { a: 1 });      // "a: 1\n"

parser.parse("string", "number", "abc");       // undefined
parser.parseOrThrow("string", "number", "abc"); // throws ParseError
parser.tryParse("string", "number", "abc");    // { ok: false, error }
```

The compiler narrows every result from the pair of formats:

```ts
const value = parser.parse("object", "yaml", { a: 1 }); // string | undefined
const data = parser.parse("json", "object", "./data.json"); // Record<string, unknown> | undefined
```

The `object` output always promises a key/value record: JSON or YAML documents whose root is a
scalar or an array are rejected and return `undefined`.

## Numbers written as words

```ts
parser.textToNumber("veintiuno");                       // 21
parser.textToNumber("un millon");                       // 1_000_000
parser.textToNumber("one thousand two hundred", "en-US"); // 1200
```

Locales are plain, typed modules. Register your own without touching the package:

```ts
parser.registerLocale("fr-FR", {
    units: { un: 1, deux: 2 },
    tens: {},
    hundreds: {},
    scales: {},
    connectors: ["et"],
});
```

## Error handling

| Method | Behaviour |
| --- | --- |
| `parse` | Returns `undefined`; never throws for invalid input. |
| `parseOrThrow` | Throws `ParseError` with `from`, `to` and the original `input`. |
| `tryParse` | Returns `{ ok: true, value }` or `{ ok: false, error }`. |

## API

- `new Parser(locales?, converters?)`
- `parse(from, to, input)`, `parseOrThrow(...)`, `tryParse(...)`
- `textToNumber(text, locale?)`
- `registerLocale(code, definition)`
- `locales`, `converters` — the underlying registries, for extension

The instance exposes `toolKind = "parser"`, so `@kyneticweb/core` makes it available as
`core.parser`.

## License

Custom Non-Commercial License. See [LICENSE.md](./LICENSE.md).
