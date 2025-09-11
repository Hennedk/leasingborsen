import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const startFiles = ["README.md", "claude.md", ".claude.md"].map(p => path.join(ROOT, p));
const seen = new Set();
const found = [];

async function add(file, depth = 0) {
  try {
    const real = path.resolve(file);
    if (seen.has(real) || depth > 2) return;
    const txt = await fs.readFile(real, "utf8");
    seen.add(real);
    found.push(path.relative(ROOT, real));
    const links = [...txt.matchAll(/\]\((\.\/|\/)?([^)#?]+\.md)(#[^)]+)?\)/gi)].map(m => m[2]);
    for (const l of links) await add(path.join(path.dirname(real), l), depth + 1);
  } catch {}
}
for (const f of startFiles) await add(f);
console.log(found.join("\n"));

