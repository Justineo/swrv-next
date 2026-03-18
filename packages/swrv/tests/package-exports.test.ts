import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vite-plus/test";

type ExportTarget = {
  import?: string;
  types?: string;
};

const currentDir = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = resolve(currentDir, "../package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
  exports: Record<string, string | ExportTarget>;
  types: string;
};

describe("package exports", () => {
  it("points the root types field at an emitted declaration file", () => {
    const target = resolve(currentDir, "..", packageJson.types.slice(2));
    expect(existsSync(target)).toBe(true);
  });

  it("points every public subpath export at emitted runtime and type files", () => {
    for (const [subpath, target] of Object.entries(packageJson.exports)) {
      if (subpath === "./package.json" || typeof target === "string") {
        continue;
      }

      expect(target.import, `${subpath} import target`).toBeTruthy();
      expect(target.types, `${subpath} types target`).toBeTruthy();

      const importTarget = resolve(currentDir, "..", target.import!.slice(2));
      const typesTarget = resolve(currentDir, "..", target.types!.slice(2));

      expect(existsSync(importTarget), `${subpath} import file`).toBe(true);
      expect(existsSync(typesTarget), `${subpath} type file`).toBe(true);
    }
  });
});
