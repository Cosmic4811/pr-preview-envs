// Tiny static-site builder with zero dependencies.
// Copies app/src into app/dist and fills in {{PLACEHOLDERS}} inside .html files.
// Run from the app/ folder:  node build.mjs
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

const SRC_DIR = "src";
const OUT_DIR = "dist";

const prNumber = process.env.PR_NUMBER || "local";
const commitSha = process.env.COMMIT_SHA || "dev";

// These values end up inside HTML, so only accept exactly the shapes we expect.
if (!/^(local|[1-9][0-9]{0,6})$/.test(prNumber)) {
  throw new Error(`Invalid PR_NUMBER: ${prNumber}`);
}
if (!/^(dev|[0-9a-f]{40})$/.test(commitSha)) {
  throw new Error(`Invalid COMMIT_SHA: ${commitSha}`);
}

const values = {
  PR_NUMBER: prNumber,
  COMMIT_SHORT: commitSha.slice(0, 7),
};

function fillPlaceholders(text) {
  return text.replace(/\{\{([A-Z_]+)\}\}/g, (match, key) => {
    if (!Object.hasOwn(values, key)) {
      throw new Error(`Unknown placeholder ${match}`);
    }
    return values[key];
  });
}

async function build(fromDir, toDir) {
  await mkdir(toDir, { recursive: true });
  for (const entry of await readdir(fromDir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) {
      continue; // hidden files such as .env never become part of a public preview
    }
    const from = join(fromDir, entry.name);
    const to = join(toDir, entry.name);
    if (entry.isDirectory()) {
      await build(from, to);
    } else if (entry.isFile() && extname(entry.name) === ".html") {
      await writeFile(to, fillPlaceholders(await readFile(from, "utf8")));
    } else if (entry.isFile()) {
      await copyFile(from, to);
    }
    // Anything else (for example symlinks) is skipped on purpose.
  }
}

await rm(OUT_DIR, { recursive: true, force: true });
await build(SRC_DIR, OUT_DIR);
console.log(`Built preview for PR ${prNumber} at commit ${values.COMMIT_SHORT}`);