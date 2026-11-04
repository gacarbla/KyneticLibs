import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: ["**/dist/**", "**/node_modules/**", "**/coverage/**", "**/*.tsbuildinfo"],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        rules: {
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/consistent-type-imports": "error",
            eqeqeq: "error",
            "no-console": "off",
        },
    },
    {
        files: ["**/*.mjs", "**/*.js"],
        languageOptions: {
            globals: {
                console: "readonly",
                process: "readonly",
                URL: "readonly",
            },
        },
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
        },
    },
    prettier,
);
