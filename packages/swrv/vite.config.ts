import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    dts: {},
    exports: true,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
  test: {
    environment: "jsdom",
  },
});
