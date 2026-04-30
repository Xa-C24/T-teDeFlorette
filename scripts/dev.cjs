const { spawn } = require("node:child_process");

const isWindows = process.platform === "win32";

function run(command, args) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: isWindows,
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      process.exit(code);
    }
  });

  return child;
}

const children = isWindows
  ? [
      run("npm run dev:api", []),
      run("npm run dev:frontend", []),
    ]
  : [
      run("npm", ["run", "dev:api"]),
      run("npm", ["run", "dev:frontend"]),
    ];

function shutdown() {
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
