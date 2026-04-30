const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const projectRoot = process.cwd();
const localHome = path.join(projectRoot, ".netlify-local");
const appDataDir = path.join(localHome, "appdata");
const localAppDataDir = path.join(localHome, "localappdata");

fs.mkdirSync(appDataDir, { recursive: true });
fs.mkdirSync(localAppDataDir, { recursive: true });

const env = {
  ...process.env,
  APPDATA: appDataDir,
  LOCALAPPDATA: localAppDataDir,
  XDG_CONFIG_HOME: appDataDir,
  XDG_CACHE_HOME: localAppDataDir,
  NO_UPDATE_NOTIFIER: "1",
};

const cliPath = path.join(projectRoot, "node_modules", "netlify-cli", "bin", "run.js");
const child = spawn(process.execPath, [cliPath, "dev"], {
  cwd: projectRoot,
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
