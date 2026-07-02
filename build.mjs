/* ==========================================================================
   EQ Sentry — production build.
   Copies the whole site into dist/ and minifies the CSS + JS there, leaving the
   source files readable. Deploy the dist/ folder.

     npm install      # one time (clean-css + terser)
     npm run build    # produces ./dist
     # then deploy ./dist  (it already contains _headers, manifest, data, etc.)

   Requires Node 18+. clean-css/terser are correct minifiers — they preserve
   calc() spacing, strings, and only mangle local variables (not window.EQ etc.),
   so this is safe in a way a hand-rolled regex minifier is not.

   Note: most hosts (Netlify, Cloudflare, Vercel) already gzip/brotli responses,
   which delivers ~70–75% of this size win automatically. This build adds the
   rest and is worth wiring into CI.
   ========================================================================== */
import { cp, rm, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import CleanCSS from "clean-css";
import { minify as terser } from "terser";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");

// Top-level entries that should NOT ship in the static bundle:
const SKIP = new Set([
  "dist", "node_modules", ".git", "server",
  "build.mjs", "package.json", "package-lock.json"
]);

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else out.push(p);
  }
  return out;
}

const kb = (n) => (n / 1024).toFixed(1) + " KB";

await rm(DIST, { recursive: true, force: true });
await cp(ROOT, DIST, {
  recursive: true,
  filter: (src) => {
    const top = path.relative(ROOT, src).split(path.sep)[0];
    return top === "" || !SKIP.has(top);
  }
});

let css = 0, js = 0, before = 0, after = 0;
for (const file of await walk(DIST)) {
  if (file.endsWith(".css")) {
    const src = await readFile(file, "utf8");
    const r = new CleanCSS({ level: 1 }).minify(src);   // level 1 = safe (no aggressive restructuring)
    if (r.errors.length) throw new Error(file + ": " + r.errors.join("; "));
    before += src.length; after += r.styles.length; css++;
    await writeFile(file, r.styles);
  } else if (file.endsWith(".js")) {
    const src = await readFile(file, "utf8");
    const r = await terser(src, { compress: true, mangle: true });
    if (!r.code) throw new Error(file + ": terser produced no output");
    before += src.length; after += r.code.length; js++;
    await writeFile(file, r.code);
  }
}

console.log(`Minified ${css} CSS + ${js} JS files into dist/`);
console.log(`Asset bytes: ${kb(before)} -> ${kb(after)} (then gzip/brotli at serve time).`);
console.log("Deploy the dist/ folder.");
