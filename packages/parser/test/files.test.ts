import { afterAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Parser } from "../src/index.js";

const parser = new Parser();
const directory = mkdtempSync(join(tmpdir(), "kynetic-parser-"));
const source = { name: "kynetic", version: 2 };
const jsonPath = join(directory, "data.json");
const yamlPath = join(directory, "data.yaml");

afterAll(() => {
    rmSync(directory, { recursive: true, force: true });
});

describe("Parser object conversions", () => {
    it("parses JSON text and rejects malformed JSON", () => {
        expect(parser.parse("string", "object", '{"name":"kynetic","version":2}')).toEqual(source);
        expect(parser.parse("string", "object", "{ nope")).toBeUndefined();
    });

    it("rejects documents that are not objects", () => {
        expect(parser.parse("string", "object", "42")).toBeUndefined();
        expect(parser.parse("string", "object", "[1,2]")).toBeUndefined();
        expect(parser.parse("string", "object", "null")).toBeUndefined();
        expect(parser.parse("string", "yaml", "- one\n- two\n")).toBeUndefined();
    });

    it("parses YAML text", () => {
        expect(parser.parse("string", "yaml", "name: kynetic\nversion: 2\n")).toEqual(source);
    });

    it("serialises objects as JSON", () => {
        expect(parser.parse("object", "string", source)).toBe(JSON.stringify(source));
    });

    it("round-trips objects through YAML", () => {
        const yamlText = parser.parse("object", "yaml", source);

        expect(typeof yamlText).toBe("string");
        writeFileSync(yamlPath, String(yamlText), "utf8");
        expect(parser.parse("yaml", "object", yamlPath)).toEqual(source);
    });
});

describe("Parser file conversions", () => {
    it("reads JSON files both ways", () => {
        writeFileSync(jsonPath, JSON.stringify(source), "utf8");

        expect(parser.parse("json", "object", jsonPath)).toEqual(source);
        expect(parser.parse("json", "string", jsonPath)).toBe(JSON.stringify(source));
        expect(parser.parse("json", "yaml", jsonPath)).toBeTypeOf("string");
    });

    it("reads YAML files both ways", () => {
        writeFileSync(yamlPath, "name: kynetic\nversion: 2\n", "utf8");

        expect(parser.parse("yaml", "object", yamlPath)).toEqual(source);
        expect(parser.parse("yaml", "string", yamlPath)).toBe(JSON.stringify(source));
    });

    it("reads file paths expressed as URLs", () => {
        expect(parser.parse("json", "object", new URL(`file:///${jsonPath.replaceAll("\\", "/")}`))).toEqual(source);
    });

    it("returns undefined for missing or unreadable files", () => {
        const missingJson = join(directory, "missing.json");
        const missingYaml = join(directory, "missing.yaml");

        expect(parser.parse("json", "object", missingJson)).toBeUndefined();
        expect(parser.parse("yaml", "object", missingYaml)).toBeUndefined();
    });
});
