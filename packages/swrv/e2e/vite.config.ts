import { fileURLToPath } from "node:url";

import { defineConfig } from "vite-plus";

const root = fileURLToPath(new URL("./", import.meta.url));
const workspaceRoot = fileURLToPath(new URL("../../../", import.meta.url));

export default defineConfig({
  root,
  server: {
    fs: {
      allow: [workspaceRoot],
    },
  },
});
