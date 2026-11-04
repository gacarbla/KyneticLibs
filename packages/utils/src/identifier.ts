import { randomUUID } from "node:crypto";

/** Number of hexadecimal characters produced by {@link randomId}. */
const UUID_HEX_LENGTH = 32;

/**
 * Generates a short, URL-safe identifier based on `crypto.randomUUID`.
 *
 * @param length Number of characters to keep (between 1 and 32).
 * @returns A lowercase hexadecimal identifier.
 * @throws {RangeError} When `length` is outside the supported range.
 *
 * @example
 * ```ts
 * randomId();     // "9f2c1a7b4e"
 * randomId(6);    // "9f2c1a"
 * ```
 */
export function randomId(length: number = 10): string {
    if (!Number.isInteger(length) || length < 1 || length > UUID_HEX_LENGTH) {
        throw new RangeError(`The identifier length must be between 1 and ${UUID_HEX_LENGTH}.`);
    }
    return randomUUID().replaceAll("-", "").slice(0, length);
}
