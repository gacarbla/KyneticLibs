import type { PluginOption } from "vite";

/** Options reserved for future compiler flags. */
export interface KyneticCompilerOptions {
    /** Reserved. */
    readonly debug?: boolean;
}

/**
 * Vite plugin that runs the Kynetic JSX compiler on `.tsx` files.
 */
export default function kynetic(options?: KyneticCompilerOptions): PluginOption;
