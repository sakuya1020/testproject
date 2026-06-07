const fs = require("node:fs");
const path = require("node:path");

process.env.HOSTNAME ||= "0.0.0.0";
process.env.PORT ||= "3000";

const serverPath = path.join(__dirname, "..", ".next", "standalone", "server.js");

console.log(`Starting Next.js standalone server on ${process.env.HOSTNAME}:${process.env.PORT}`);
console.log(`Server entry: ${serverPath}`);

if (!fs.existsSync(serverPath)) {
  console.error(`Server entry was not found: ${serverPath}`);
  process.exit(1);
}

require(serverPath);
