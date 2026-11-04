import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["packages/*/test/**/*.test.ts"],
        reporters: ["default"],
        coverage: {
            include: ["packages/*/src/**/*.ts"],
            exclude: ["packages/*/src/**/*.test.ts"],
        },
    },
});
