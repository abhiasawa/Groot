// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Allow metro to resolve files from the shared directory (outside mobile/)
const sharedDir = path.resolve(__dirname, "../shared");

config.watchFolders = [sharedDir];

module.exports = config;
