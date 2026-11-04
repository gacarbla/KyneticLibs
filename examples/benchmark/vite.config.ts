import { defineConfig } from "vite";
import kynetic from "@kyneticweb/compiler/vite";

export default defineConfig({
    plugins: [kynetic({ exclude: [/\.react\.tsx$/] })],
});
