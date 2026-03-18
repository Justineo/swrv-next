import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  lint: { options: { typeAware: true, typeCheck: true } },
  test: {
    environment: "jsdom",
    include: ["packages/swrv/tests/**/*.test.ts"],
    exclude: ["apps/**", "packages/utils/**"],
  },
});
