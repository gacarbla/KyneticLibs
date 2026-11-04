import { Parser } from "@kyneticweb/parser";

const parser = new Parser();

console.log(parser.parse("string", "number", "12")); // 12
console.log(parser.parse("string", "boolean", "yes")); // true
console.log(parser.parse("object", "yaml", { name: "Kynetic", version: 2 })); // YAML text

console.log(parser.textToNumber("Tresmil cuatrocientos cincuenta y tres")); // 3453
console.log(parser.textToNumber("one thousand two hundred", "en-US")); // 1200

const result = parser.tryParse("string", "number", "not a number");
console.log(result.ok); // false
