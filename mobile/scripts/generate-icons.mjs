#!/usr/bin/env node
/**
 * Generate app icon PNGs from SVG source.
 *
 * Usage:
 *   npx tsx scripts/generate-icons.mjs
 *   # or: node scripts/generate-icons.mjs  (needs sharp installed)
 *
 * Requires: npm install --save-dev sharp
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, "..", "assets", "images");

async function main() {
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.error("sharp not installed. Run: npm install --save-dev sharp");
    process.exit(1);
  }

  const svgBuffer = readFileSync(join(assetsDir, "icon.svg"));

  const sizes = [
    { name: "icon.png", size: 1024 },
    { name: "adaptive-icon.png", size: 1024 },
    { name: "favicon.png", size: 48 },
    { name: "splash-icon.png", size: 512 },
  ];

  for (const { name, size } of sizes) {
    const outPath = join(assetsDir, name);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log(`✓ ${name} (${size}x${size})`);
  }

  console.log("\nDone! Icon PNGs generated from SVG.");
}

main().catch(console.error);
