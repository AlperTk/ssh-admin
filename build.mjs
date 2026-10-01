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

await esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: "dist/bundle.cjs",
  external: ["ssh2", "cpu-features", "@modelcontextprotocol/sdk"],
  define: {
    "import.meta.url": "__importMetaUrl",
  },
  sourcemap: true,
  banner: {
    js: '#!/usr/bin/env node\nconst __importMetaUrl = require("url").pathToFileURL(__filename).href;',
  },
});

console.log("Bundle created: dist/bundle.cjs");
