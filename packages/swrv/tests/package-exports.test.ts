import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it } from "vite-plus/test";

type ExportTarget = {
  import?: string;
  types?: string;
};

const currentDir = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = resolve(currentDir, "../package.json");
const packageRoot = dirname(packageJsonPath);
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
  exports: Record<string, ExportTarget | string>;
  files: string[];
  types: string;
};

function ensureBuiltPackage() {
  const rootTypesTarget = resolve(packageRoot, packageJson.types.slice(2));
  if (existsSync(rootTypesTarget)) {
    return;
  }

  execFileSync("vp", ["run", "build"], {
    cwd: packageRoot,
    stdio: "inherit",
  });
}

describe("package exports", () => {
  beforeAll(() => {
    ensureBuiltPackage();
  });

  it("points the root types field at an emitted declaration file", () => {
    const target = resolve(packageRoot, packageJson.types.slice(2));
    expect(existsSync(target)).toBe(true);
  });

  it("points every public subpath export at emitted runtime and type files", () => {
    for (const [subpath, target] of Object.entries(packageJson.exports)) {
      if (subpath === "./package.json") {
        continue;
      }

      if (typeof target === "string") {
        throw new Error(`${subpath} export should expose explicit runtime and type targets.`);
      }

      expect(target.import, `${subpath} import target`).toBeTruthy();
      expect(target.types, `${subpath} types target`).toBeTruthy();

      const importTarget = resolve(packageRoot, target.import!.slice(2));
      const typesTarget = resolve(packageRoot, target.types!.slice(2));

      expect(existsSync(importTarget), `${subpath} import file`).toBe(true);
      expect(existsSync(typesTarget), `${subpath} type file`).toBe(true);
    }
  });

  it("includes the package readme and license in the published files", () => {
    expect(packageJson.files).toContain("README.md");
    expect(packageJson.files).toContain("LICENSE");
    expect(existsSync(resolve(currentDir, "../README.md"))).toBe(true);
    expect(existsSync(resolve(currentDir, "../LICENSE"))).toBe(true);
  });
});
