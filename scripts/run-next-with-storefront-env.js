#!/usr/bin/env node
// Thin launcher used by the package.json scripts: forwards its CLI arguments
// to the local Next.js binary (e.g. `dev -p 8000`, `build`, `start`).
// Storefront-specific env mapping can be added here when it becomes relevant.
const { spawn } = require("child_process")
const path = require("path")

const nextBin = path.join(
  __dirname,
  "..",
  "node_modules",
  "next",
  "dist",
  "bin",
  "next"
)

const child = spawn(process.execPath, [nextBin, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
})

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 0)
})
