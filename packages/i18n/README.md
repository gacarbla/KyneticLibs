# `@kyneticweb/i18n`

Typed messages, interpolation, plurals and locale formatting for the Kynetic runtime.

## Installation

```bash
npm install @kyneticweb/i18n
```

## Usage

```ts
import { createI18n } from "@kyneticweb/i18n";

const i18n = createI18n({
    locale: "es",
    messages: {
        es: {
            hello: "Hola {name}",
            "items.one": "{count} elemento",
            "items.other": "{count} elementos",
        },
        en: {
            hello: "Hello {name}",
            "items.one": "{count} item",
            "items.other": "{count} items",
        },
    },
    fallbackLocale: "es",
    detect: true,
    persist: "app:lang",
});

i18n.t("hello", { name: "Gabe" }); // "Hola Gabe"
i18n.tp("items", 2);                // "2 elementos"

i18n.setLocale("en");
i18n.t("hello", { name: "Gabe" }); // "Hello Gabe"
```

`t` and `tp` read the locale signal, so using them inside a component or an effect makes the
text reactive:

```tsx
function Greeting() {
    return <p>{i18n.t("hello", { name: "Gabe" })}</p>;
}
```

## API

| Member | Description |
| --- | --- |
| `locale` | Reactive locale signal. |
| `languages` | Available locale codes. |
| `setLocale(code)` | Changes the locale, validates it and persists it when configured. |
| `t(key, vars?)` | Interpolates `{placeholders}`; falls back to the fallback locale, then the key. |
| `tp(key, count, vars?)` | Selects `key.one`/`key.other`/… with `Intl.PluralRules`. |
| `formatNumber(value, options?)` | `Intl.NumberFormat` with the active locale. |
| `formatDate(value, options?)` | `Intl.DateTimeFormat` with the active locale. |
| `exists(key)` | Whether the key exists in the active or fallback locale. |

## Notes

- Keys are inferred from the dictionaries: unknown keys and missing plural bases are compile
  errors.
- `detect` uses `navigator.languages` and falls back to the base language (`en-US` → `en`).
- `persist` uses `localStorage` and is safe when storage is disabled or unavailable (SSR).
- Locale changes are reactive; `formatNumber`/`formatDate` read the locale on every call.

## License

Custom Non-Commercial License. See [LICENSE.md](./LICENSE.md).
