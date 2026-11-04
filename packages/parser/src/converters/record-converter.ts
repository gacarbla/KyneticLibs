import type { IConverter } from "./i-converter.js";

/**
 * Reports whether a value is a plain object, as produced by a JSON or YAML
 * document with a mapping at its root.
 *
 * Arrays, `null` and scalars are rejected: the `object` output format always
 * promises a key/value record, never an arbitrary JSON value.
 *
 * @example
 * ```ts
 * isRecord({ ok: true }); // true
 * isRecord([1, 2]);       // false
 * ```
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Narrows a parsed document to a plain object.
 *
 * Used after reading JSON or YAML so the public `object` output never returns a
 * value that contradicts its declared type.
 *
 * @example
 * ```ts
 * new RecordConverter().convert('{ "ok": true }'); // undefined: still text
 * new RecordConverter().convert({ ok: true });     // { ok: true }
 * ```
 */
export class RecordConverter implements IConverter {
    /**
     * @param input Parsed document.
     * @returns The same value when it is a plain object, otherwise `undefined`.
     */
    public convert(input: unknown): unknown {
        return isRecord(input) ? input : undefined;
    }
}
