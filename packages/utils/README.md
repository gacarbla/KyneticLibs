# `@kyneticweb/utils`

Small, dependency-free helpers shared by the other Kynetic libraries.

## Installation

```bash
npm install @kyneticweb/utils
```

## `DateFormatter`

Compiles a pattern once and formats any number of dates.

```ts
import { DateFormatter, formatDate } from "@kyneticweb/utils";

const formatter = new DateFormatter("DD-MM-YYYY HH:mm:ss");
formatter.format(new Date()); // "04-11-2026 17:32:10"

formatDate(new Date(), "YYYY-MM-DD"); // "2026-11-04"
```

| Token | Meaning | Example |
| --- | --- | --- |
| `YYYY` | Four digit year | 2026 |
| `YY` | Two digit year | 26 |
| `MM` / `M` | Month, padded / not padded | 03 / 3 |
| `DD` / `D` | Day of month, padded / not padded | 07 / 7 |
| `HH` / `H` | Hours, padded / not padded | 09 / 9 |
| `mm` / `m` | Minutes, padded / not padded | 05 / 5 |
| `ss` / `s` | Seconds, padded / not padded | 02 / 2 |

Text inside square brackets is copied verbatim: `"[Day] D"` produces `"Day 7"`.

## `wrapText`

Wraps text to a maximum width, keeping explicit line breaks and splitting words that do not fit.

```ts
import { wrapText } from "@kyneticweb/utils";

wrapText("hello world", 5); // ["hello", "world"]
```

## `randomId`

Generates a short identifier from a cryptographically secure UUID.

```ts
import { randomId } from "@kyneticweb/utils";

randomId();    // "9f2c1a7b4e"
randomId(6);   // "9f2c1a"
```

## License

Custom Non-Commercial License. See [LICENSE.md](./LICENSE.md).
