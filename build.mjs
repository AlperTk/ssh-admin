import * as esbuild from "esbuild";
import * as fs from "fs";

// Ensure dist directory exists
if (!fs.existsSync("dist")) {
  fs.mkdirSync("dist", { recursive: true });
}

await esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: "dist/bundle.js",
  external: [],
  sourcemap: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
});

console.log("Bundle created: dist/bundle.js");
