import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CURRENT_CONTRACT = "0x1C549AA74bEf8d34BCa5B0c0Fa538096d55dB175";
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

function run(label, command, args, options = {}) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, args, {
    cwd: options.cwd || ROOT,
    env: { ...process.env, ...(options.env || {}) },
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) {
    console.error(result.error);
  }
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

const studioContract = process.env.BACKIT_CONTRACT || CURRENT_CONTRACT;

run("Direct contract tests", "uv", ["run", "pytest", "tests/direct", "-q"]);
run("Production web build", npmCmd, ["run", "build"], { cwd: resolve(ROOT, "web") });
run("Studio Next integration tests", "uv", ["run", "pytest", "tests/integration", "-q"], {
  env: { BACKIT_CONTRACT: studioContract },
});

console.log("\nVerification gate passed.");
