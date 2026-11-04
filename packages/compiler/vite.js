import { transformSync } from "@babel/core";
import kyneticJsx from "./babel.cjs";

/**
 * Vite plugin that runs the Kynetic JSX compiler on `.tsx` files.
 *
 * It only wraps dynamic expressions; Vite's esbuild step still compiles TSX
 * into `jsx(...)` calls. Configure the factory in `vite.config.ts`:
 *
 * ```ts
 * esbuild: {
 *   jsxFactory: "jsx",
 *   jsxFragment: "Fragment",
 *   jsxInject: `import { jsx, Fragment } from "@kyneticweb/dom";`,
 * }
 * ```
 *
 * @param options Reserved for future compiler flags.
 * @returns A Vite plugin.
 */
export default function kynetic(options = {}) {
    return {
        name: "kynetic-jsx",
        enforce: "pre",
        transform(code, id) {
            const filename = id.split("?")[0];
            if (!filename.endsWith(".tsx")) {
                return null;
            }

            const result = transformSync(code, {
                filename,
                sourceMaps: true,
                babelrc: false,
                configFile: false,
                parserOpts: { plugins: ["typescript", "jsx"] },
                plugins: [[kyneticJsx, options]],
            });

            return { code: result?.code ?? code, map: result?.map ?? null };
        },
    };
}
