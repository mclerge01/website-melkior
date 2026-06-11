import { spawnSync } from "child_process";

const REQUIRED_RUNTIME_SECRETS = [
  "ADMIN_SESSION_SECRET",
  "CONTACT_DESTINATION",
  "GITHUB_CLIENT_SECRET",
  "TURNSTILE_SECRET",
];

if (process.env.WORKERS_CI !== "1") {
  process.exit(0);
}

const missing = REQUIRED_RUNTIME_SECRETS.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Missing Workers runtime secret values in build environment: ${missing.join(", ")}`);
  process.exit(1);
}

const secrets = Object.fromEntries(REQUIRED_RUNTIME_SECRETS.map((name) => [name, process.env[name]]));
const result = spawnSync("npx", ["wrangler", "secret", "bulk", "--name", "website-melkior"], {
  input: JSON.stringify(secrets),
  encoding: "utf-8",
  stdio: ["pipe", "inherit", "inherit"],
  shell: process.platform === "win32",
});

if (result.status !== 0) {
  process.exit(result.status || 1);
}

console.log(`Synchronized ${REQUIRED_RUNTIME_SECRETS.length} Worker runtime secrets.`);
