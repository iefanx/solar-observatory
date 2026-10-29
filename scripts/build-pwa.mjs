import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const root = new URL("../dist/", import.meta.url);
const paths = fs
  .readdirSync(root, { recursive: true })
  .filter(
    (file) =>
      fs.statSync(new URL(file, root)).isFile() &&
      file !== "sw.js" &&
      !file.endsWith(".txt") &&
      file !== ".nojekyll",
  )
  .sort();
const hash = crypto.createHash("sha256");
for (const file of paths) {
  hash.update(file);
  hash.update(fs.readFileSync(new URL(file, root)));
}
const version = hash.digest("hex").slice(0, 16);
let source = fs.readFileSync(
  new URL("./sw-template.js", import.meta.url),
  "utf8",
);
source = source
  .replace(
    "__CACHE_NAME__",
    `'solar-observatory-' + new URL(self.registration.scope).pathname + '-${version}'`,
  )
  .replace("__PRECACHE__", JSON.stringify(paths));
if (process.argv.includes("--check")) {
  if (fs.readFileSync(new URL("sw.js", root), "utf8") !== source)
    throw new Error(
      "Offline cache is stale. Run npm run prepare:pwa before publishing.",
    );
} else fs.writeFileSync(new URL("sw.js", root), source);
console.log(`Offline release ${version}: ${paths.length} files`);
