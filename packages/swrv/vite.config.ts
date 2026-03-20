import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    dts: {},
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
