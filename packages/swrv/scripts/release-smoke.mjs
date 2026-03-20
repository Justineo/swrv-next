import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "..");
const repoRoot = resolve(packageRoot, "../..");
const consumerTemplateDir = resolve(scriptDir, "release-smoke/consumer");
const keepTemporaryFiles = process.env.SWRV_KEEP_SMOKE_TMP === "1";

let cleanupPaths = [];
let cleanupCompleted = false;

function run(command, args, cwd) {
  execFileSync("/bin/zsh", ["-lc", [command, ...args.map(shellQuote)].join(" ")], {
    cwd,
    stdio: "inherit",
  });
}

function runAndCapture(command, args, cwd) {
  return execFileSync("/bin/zsh", ["-lc", [command, ...args.map(shellQuote)].join(" ")], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
}

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function createTemporaryDirectory(prefix) {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  cleanupPaths.push(directory);
  return directory;
}

function createConsumerPackageJson(tarballPath) {
  const rootPackageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));

  return {
    name: "swrv-packed-consumer-smoke",
    private: true,
    type: "module",
    packageManager: rootPackageJson.packageManager,
    dependencies: {
      swrv: `file:${tarballPath}`,
      vue: "^3.5.30",
    },
    devDependencies: {
      "@types/node": "^24.0.0",
      typescript: "^5.5.0",
    },
  };
}

function parsePackResult(packOutput) {
  const result = JSON.parse(packOutput);

  if (typeof result.filename !== "string" || result.filename.length === 0) {
    throw new Error("Expected `vp pm pack -- --json` to return a tarball filename.");
  }

  return result.filename;
}

function cleanupTemporaryDirectories(reason) {
  if (cleanupCompleted) {
    return;
  }

  cleanupCompleted = true;

  if (keepTemporaryFiles) {
    console.error(`Keeping release smoke temp directories (${reason}).`);
    for (const directory of cleanupPaths) {
      console.error(`- ${directory}`);
    }
    return;
  }

  for (const directory of cleanupPaths.reverse()) {
    rmSync(directory, {
      force: true,
      recursive: true,
    });
  }
}

function registerSignalHandlers() {
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(signal, () => {
      cleanupTemporaryDirectories(`received ${signal}`);
      process.exit(128 + signalNumber(signal));
    });
  }
}

function signalNumber(signal) {
  switch (signal) {
    case "SIGINT":
      return 2;
    case "SIGTERM":
      return 15;
    case "SIGHUP":
      return 1;
    default:
      return 1;
  }
}

function main() {
  const artifactsDir = createTemporaryDirectory("swrv-release-artifacts-");
  const consumerDir = createTemporaryDirectory("swrv-packed-consumer-");

  registerSignalHandlers();

  try {
    run("vp", ["run", "build"], packageRoot);
    const packOutput = runAndCapture(
      "vp",
      ["pm", "pack", "--", "--json", "--pack-destination", artifactsDir],
      packageRoot,
    );
    run(
      "vp",
      [
        "pm",
        "publish",
        "--",
        "--dry-run",
        "--access",
        "public",
        "--provenance",
        "--no-git-checks",
        "--tag",
        "next",
      ],
      packageRoot,
    );

    const tarballPath = parsePackResult(packOutput);

    cpSync(consumerTemplateDir, consumerDir, {
      recursive: true,
    });
    writeFileSync(
      join(consumerDir, "check.ts"),
      readFileSync(join(consumerDir, "check.template.txt"), "utf8"),
    );
    rmSync(join(consumerDir, "check.template.txt"));
    writeFileSync(
      join(consumerDir, "package.json"),
      `${JSON.stringify(createConsumerPackageJson(tarballPath), null, 2)}\n`,
    );

    run("vp", ["install"], consumerDir);
    run("vp", ["exec", "tsc", "--project", "tsconfig.json"], consumerDir);
    run(process.execPath, ["./runtime.mjs"], consumerDir);
  } catch (error) {
    if (!keepTemporaryFiles) {
      console.error(
        "Release smoke failed. Set SWRV_KEEP_SMOKE_TMP=1 to retain temporary artifacts for debugging.",
      );
    }
    cleanupTemporaryDirectories("failure");
    throw error;
  } finally {
    cleanupTemporaryDirectories("success");
  }
}

main();
