#!/usr/bin/env node
/**
 * Bump the app version across app.json, package.json, and build.gradle.
 *
 * Usage:
 *   node scripts/bump-version.js patch   # 1.0.0 → 1.0.1
 *   node scripts/bump-version.js minor   # 1.0.0 → 1.1.0
 *   node scripts/bump-version.js major   # 1.0.0 → 2.0.0
 *   node scripts/bump-version.js 1.2.3   # set exact version
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
}

function writeJson(file, data) {
  fs.writeFileSync(path.join(ROOT, file), JSON.stringify(data, null, 2) + "\n");
}

function bumpSemver(current, type) {
  const [major, minor, patch] = current.split(".").map(Number);
  switch (type) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      // Exact version provided
      if (/^\d+\.\d+\.\d+$/.test(type)) return type;
      console.error(`Invalid bump type: ${type}`);
      process.exit(1);
  }
}

function main() {
  const type = process.argv[2] || "patch";

  // 1. Read current version from app.json
  const appJson = readJson("app.json");
  const currentVersion = appJson.expo.version;
  const newVersion = bumpSemver(currentVersion, type);

  // Calculate new versionCode (ints from semver: 1.2.3 → 10203)
  const [maj, min, pat] = newVersion.split(".").map(Number);
  const newVersionCode = maj * 10000 + min * 100 + pat;

  console.log(`Bumping version: ${currentVersion} → ${newVersion} (versionCode: ${newVersionCode})`);

  // 2. Update app.json
  appJson.expo.version = newVersion;
  writeJson("app.json", appJson);
  console.log("  ✓ app.json");

  // 3. Update package.json
  const pkgJson = readJson("package.json");
  pkgJson.version = newVersion;
  writeJson("package.json", pkgJson);
  console.log("  ✓ package.json");

  // 4. Update build.gradle
  const gradlePath = path.join(ROOT, "android/app/build.gradle");
  let gradle = fs.readFileSync(gradlePath, "utf8");
  gradle = gradle.replace(/versionCode \d+/, `versionCode ${newVersionCode}`);
  gradle = gradle.replace(/versionName "[\d.]+"/, `versionName "${newVersion}"`);
  fs.writeFileSync(gradlePath, gradle);
  console.log("  ✓ android/app/build.gradle");

  console.log(`\nDone! Version is now ${newVersion}`);
}

main();
