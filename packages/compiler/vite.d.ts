import type { PluginOption } from "vite";

/** Options accepted by the Kynetic Vite plugin. */
export interface KyneticCompilerOptions {
    /** Files matching any pattern are left untouched (for example React code). */
    readonly exclude?: readonly RegExp[];
}

/**
 * Vite plugin that runs the Kynetic JSX compiler on `.tsx` files.
 */
export default function kynetic(options?: KyneticCompilerOptions): PluginOption;
