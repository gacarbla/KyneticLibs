import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDirectory = fileURLToPath(new URL("..", import.meta.url));
const packagesDirectory = join(rootDirectory, "packages");

const packageNames = await readdir(packagesDirectory);

for (const packageName of packageNames) {
    await rm(join(packagesDirectory, packageName, "dist"), { recursive: true, force: true });
}

console.log(`Removed build output for ${packageNames.length} packages.`);
