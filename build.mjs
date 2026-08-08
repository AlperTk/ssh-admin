import * as esbuild from "esbuild";
import * as fs from "fs";
import * as path from "path";

// Ensure dist directory exists
if (!fs.existsSync("dist")) {
  fs.mkdirSync("dist", { recursive: true });
}

// Copy data files to dist
const srcDataDir = path.join("src", "data");
const distDataDir = path.join("dist", "data");
if (fs.existsSync(srcDataDir)) {
  if (!fs.existsSync(distDataDir)) {
    fs.mkdirSync(distDataDir, { recursive: true });
  }
  for (const file of fs.readdirSync(srcDataDir)) {
    fs.copyFileSync(path.join(srcDataDir, file), path.join(distDataDir, file));
  }
}

// Copy instruction.md to dist
if (fs.existsSync("instruction.md")) {
  fs.copyFileSync("instruction.md", path.join("dist", "instruction.md"));
}

await esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: "dist/bundle.cjs",
  external: [],
  sourcemap: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
});

console.log("Bundle created: dist/bundle.cjs");
