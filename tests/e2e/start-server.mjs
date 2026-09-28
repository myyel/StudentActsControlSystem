// Starts the e2e build the way production does (Dockerfile): the standalone server with
// public/ and the static files copied next to it.
import { cpSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const dist = process.env.NEXT_DIST_DIR || ".next";
const root = path.join(dist, "standalone");
cpSync("public", path.join(root, "public"), { recursive: true });
cpSync(path.join(dist, "static"), path.join(root, dist, "static"), { recursive: true });

process.chdir(root);
await import(pathToFileURL(path.resolve("server.js")).href);
