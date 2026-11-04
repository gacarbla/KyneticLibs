import type { LocaleDefinition } from "../types.js";

/**
 * English (United States) words used by {@link NumberWordsParser}.
 *
 * @example
 * ```ts
 * parser.textToNumber("one thousand two hundred", "en-US"); // 1200
 * ```
 */
export const enUS: LocaleDefinition = {
    units: {
        zero: 0,
        one: 1,
        two: 2,
        three: 3,
        four: 4,
        five: 5,
        six: 6,
        seven: 7,
        eight: 8,
        nine: 9,
        ten: 10,
        eleven: 11,
        twelve: 12,
        thirteen: 13,
        fourteen: 14,
        fifteen: 15,
        sixteen: 16,
        seventeen: 17,
        eighteen: 18,
        nineteen: 19,
    },
    tens: {
        twenty: 20,
        thirty: 30,
        forty: 40,
        fifty: 50,
        sixty: 60,
        seventy: 70,
        eighty: 80,
        ninety: 90,
    },
    hundreds: {
        hundred: 100,
    },
    scales: {
        thousand: 1_000,
        thousands: 1_000,
        million: 1_000_000,
        millions: 1_000_000,
    },
    connectors: ["and"],
};
