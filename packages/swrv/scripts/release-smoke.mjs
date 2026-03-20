import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "..");
const repoRoot = resolve(packageRoot, "../..");
const consumerTemplateDir = resolve(scriptDir, "release-smoke/consumer");

function run(command, args, cwd) {
  execFileSync("/bin/zsh", ["-lc", [command, ...args.map(shellQuote)].join(" ")], {
    cwd,
    stdio: "inherit",
  });
}

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
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

function findTarball(artifactsDir) {
  const tarballs = readdirSync(artifactsDir)
    .filter((entry) => entry.endsWith(".tgz"))
    .map((entry) => join(artifactsDir, entry));

  if (tarballs.length !== 1) {
    throw new Error(`Expected exactly one tarball in ${artifactsDir}, found ${tarballs.length}.`);
  }

  return tarballs[0];
}

function main() {
  const artifactsDir = mkdtempSync(join(tmpdir(), "swrv-release-artifacts-"));
  const consumerDir = mkdtempSync(join(tmpdir(), "swrv-packed-consumer-"));
  let cleanup = true;

  try {
    run("vp", ["run", "build"], packageRoot);
    run("vp", ["pm", "pack", "--", "--pack-destination", artifactsDir], packageRoot);
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

    const tarballPath = findTarball(artifactsDir);

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
    cleanup = false;
    console.error(`Release verification artifacts retained at ${artifactsDir}`);
    console.error(`Packed-consumer smoke workspace retained at ${consumerDir}`);
    throw error;
  } finally {
    if (cleanup && !process.env.SWRV_KEEP_SMOKE_TMP) {
      rmSync(artifactsDir, {
        force: true,
        recursive: true,
      });
      rmSync(consumerDir, {
        force: true,
        recursive: true,
      });
    }
  }
}

main();
