#!/usr/bin/env node
// Launch omp's headed Edge with the full 13-extension arsenal.
// Policy (ExtensionSettings, HKLM) auto-installs the 11 CWS-hosted ones;
// Bitwarden + Refined GitHub ship outside the Web Store, so they load
// unpacked from TEMP\exts. Re-run after a reboot/ext cleanup.
// Usage: bun scripts/edge-full.mjs
import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const base = join(process.env.TEMP, "exts");
const edge = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const dirs = ["bitwarden","tampermonkey","ublock","refined-github","octotree","editthiscookie","onetab","vimium","jsonview","switchyomega","modheader","wappalyzer","react-devtools"];
const present = dirs.filter(d => existsSync(join(base, d, "manifest.json")));
console.log(`loading ${present.length}/${dirs.length} extensions`);
if (present.length < dirs.length) console.log("missing:", dirs.filter(d => !present.includes(d)).join(", "));
const extArg = "--load-extension=" + present.map(d => join(base, d)).join(",");
const child = spawn(edge, [extArg, "--start-maximized", "https://github.com/login"], { detached: true, stdio: "ignore" });
child.unref();
console.log("Edge pid:", child.pid);