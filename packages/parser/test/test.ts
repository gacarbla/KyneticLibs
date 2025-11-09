import Parser from '../src';

const parser = new Parser();

const jsonPath = require('path').resolve(__dirname, 'test.json');
const obj2 = parser.parse('json', 'object', jsonPath);
console.log('JSON to object:', obj2);

const num = parser.parse('string', 'number', '123');
console.log('String to number:', num);

const bool = parser.parse('string', 'boolean', 'true');
console.log('String to boolean:', bool);

const date = parser.parse('stringDate', 'date', '2025-11-02T12:00:00Z');
console.log('StringDate to Date:', date);

const dateStrFunc = parser.parse('stringDatePlaceholder', 'function', 'YYYY-MM-DD HH:mm:ss') as (date: Date) => string;
const formattedDate = dateStrFunc(new Date(Date.now()));
console.log('Formatted date string:', formattedDate);

console.log('Text to number:', parser.textToNumber("Tresmil cuatrocientos cincuenta y tres", "es-ES")) // 3453