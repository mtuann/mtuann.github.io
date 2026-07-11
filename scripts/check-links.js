const fs = require("fs");
const path = require("path");

const root = process.cwd();
const skipDirs = new Set([".git", "node_modules"]);
const externalPattern = /^(https?:|mailto:|tel:|#|\/\/|javascript:)/i;
const htmlFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      htmlFiles.push(fullPath);
    }
  }
}

function localTarget(baseFile, ref) {
  if (externalPattern.test(ref)) return null;

  const cleanRef = ref.split("#")[0].split("?")[0];
  if (!cleanRef) return null;

  const decoded = decodeURIComponent(cleanRef);
  return decoded.startsWith("/")
    ? path.join(root, decoded)
    : path.join(path.dirname(baseFile), decoded);
}

walk(root);

const missing = [];
let checked = 0;

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const refs = html.matchAll(/(?:href|src)=["']([^"']+)["']/g);

  for (const match of refs) {
    const target = localTarget(file, match[1]);
    if (!target) continue;

    checked += 1;
    if (!fs.existsSync(target)) {
      missing.push(`${path.relative(root, file)} -> ${match[1]}`);
    }
  }
}

if (missing.length) {
  console.error("Missing local links:\n" + missing.join("\n"));
  process.exit(1);
}

console.log(`Checked ${checked} local links across ${htmlFiles.length} HTML file(s).`);
