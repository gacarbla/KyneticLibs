/**
 * Verifies that every workspace package is publishable and consumable as an
 * ES module.
 *
 * For each package:
 *   1. `package.json` declares ESM with `types` before `import`.
 *   2. `main` and `types` point to files that exist after a build.
 *   3. `npm pack --dry-run` ships `dist/index.js` and `dist/index.d.ts`, and
 *      never ships build metadata (`*.tsbuildinfo`).
 *   4. The package can be resolved by name through its `exports` map.
 *
 * Usage: `npm run build && npm run smoke`
 */
import { execFileSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDirectory = fileURLToPath(new URL("..", import.meta.url));
const packagesDirectory = join(rootDirectory, "packages");

const PACKAGE_NAMES = [
    "utils",
    "reactive",
    "dom",
    "router",
    "i18n",
    "forms",
    "container",
    "counter",
    "versions",
    "parser",
    "console",
    "core",
    "compiler",
];

const failures = [];

for (const packageName of PACKAGE_NAMES) {
    const packageDirectory = join(packagesDirectory, packageName);
    const manifestPath = join(packageDirectory, "package.json");

    try {
        const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

        if (manifest.type !== "module") {
            throw new Error(`"type" should be "module", found ${JSON.stringify(manifest.type)}`);
        }

        if (packageName === "compiler") {
            for (const file of ["babel.cjs", "vite.js", "vite.d.ts"]) {
                await access(join(packageDirectory, file));
            }
            const packed = listPackedFiles(manifest.name);
            for (const file of ["babel.cjs", "vite.js"]) {
                if (!packed.includes(file)) {
                    throw new Error(`the tarball does not contain ${file}`);
                }
            }
            console.log(`ok   ${manifest.name}`);
            continue;
        }

        const exportEntry = manifest.exports?.["."] ?? {};
        if (exportEntry.types !== "./dist/index.d.ts" || exportEntry.import !== "./dist/index.js") {
            throw new Error(`"exports" is not ESM-only: ${JSON.stringify(manifest.exports)}`);
        }

        for (const field of ["main", "types"]) {
            await access(join(packageDirectory, manifest[field]));
        }

        const packedFiles = listPackedFiles(manifest.name);
        for (const expected of ["dist/index.js", "dist/index.d.ts"]) {
            if (!packedFiles.includes(expected)) {
                throw new Error(`the tarball does not contain ${expected}`);
            }
        }
        const metadataFile = packedFiles.find((file) => file.endsWith(".tsbuildinfo"));
        if (metadataFile !== undefined) {
            throw new Error(`the tarball ships build metadata: ${metadataFile}`);
        }

        const entryPoint = pathToFileURL(join(packageDirectory, "dist", "index.js")).href;
        const resolved = await import(manifest.name).catch(() => import(entryPoint));
        if (Object.keys(resolved).length === 0) {
            throw new Error("the entry point exports nothing");
        }

        console.log(`ok   ${manifest.name}`);
    } catch (error) {
        failures.push(`${packageName}: ${error instanceof Error ? error.message : String(error)}`);
        console.error(`fail ${packageName}`);
    }
}

if (failures.length > 0) {
    console.error(`\n${failures.length} package(s) failed:\n- ${failures.join("\n- ")}`);
    process.exitCode = 1;
} else {
    console.log("\nAll packages are importable, correctly declared and publishable.");
}

/** Returns the file paths that `npm pack` would include for a package. */
function listPackedFiles(packageName) {
    const options = {
        cwd: rootDirectory,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
    };
    const npmExecutable = process.env.npm_execpath;
    const output = npmExecutable
        ? execFileSync(
              process.execPath,
              [npmExecutable, "pack", "--dry-run", "--json", "--workspace", packageName],
              options,
          )
        : execFileSync("npm", ["pack", "--dry-run", "--json", "--workspace", packageName], {
              ...options,
              shell: true,
          });

    const start = output.indexOf("[");
    const end = output.lastIndexOf("]");
    const report = JSON.parse(output.slice(start, end + 1));
    const files = report[0]?.files ?? [];
    return files.map((file) => file.path.replaceAll("\\", "/"));
}
