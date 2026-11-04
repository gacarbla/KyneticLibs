import type { LocaleDefinition } from "../types.js";

/**
 * Spanish (Spain) words used by {@link NumberWordsParser}.
 *
 * Keys are written without accents because the parser normalises its input to
 * plain lowercase ASCII before looking words up.
 *
 * @example
 * ```ts
 * parser.textToNumber("veintiuno", "es-ES"); // 21
 * ```
 */
export const esES: LocaleDefinition = {
    units: {
        cero: 0,
        un: 1,
        uno: 1,
        dos: 2,
        tres: 3,
        cuatro: 4,
        cinco: 5,
        seis: 6,
        siete: 7,
        ocho: 8,
        nueve: 9,
        diez: 10,
        once: 11,
        doce: 12,
        trece: 13,
        catorce: 14,
        quince: 15,
        dieciseis: 16,
        diecisiete: 17,
        dieciocho: 18,
        diecinueve: 19,
        veinte: 20,
        veintiun: 21,
        veintiuno: 21,
        veintidos: 22,
        veintitres: 23,
        veinticuatro: 24,
        veinticinco: 25,
        veintiseis: 26,
        veintisiete: 27,
        veintiocho: 28,
        veintinueve: 29,
    },
    tens: {
        diez: 10,
        veinte: 20,
        treinta: 30,
        cuarenta: 40,
        cincuenta: 50,
        sesenta: 60,
        setenta: 70,
        ochenta: 80,
        noventa: 90,
    },
    hundreds: {
        cien: 100,
        ciento: 100,
        doscientos: 200,
        trescientos: 300,
        cuatrocientos: 400,
        quinientos: 500,
        seiscientos: 600,
        setecientos: 700,
        ochocientos: 800,
        novecientos: 900,
    },
    scales: {
        mil: 1_000,
        millon: 1_000_000,
        millones: 1_000_000,
    },
    connectors: ["y", "con", "e"],
};
