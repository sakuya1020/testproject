const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const standaloneDir = path.join(root, ".next", "standalone");
const staticSource = path.join(root, ".next", "static");
const staticTarget = path.join(standaloneDir, ".next", "static");
const publicSource = path.join(root, "public");
const publicTarget = path.join(standaloneDir, "public");

copyDirectory(staticSource, staticTarget);

if (fs.existsSync(publicSource)) {
  copyDirectory(publicSource, publicTarget);
}

console.log("Prepared Next.js standalone static assets.");

function copyDirectory(source, target) {
  if (!fs.existsSync(source)) {
    throw new Error(`Required directory was not found: ${source}`);
  }

  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
}
