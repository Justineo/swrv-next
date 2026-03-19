import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";

import HomePage from "./components/HomePage.vue";
import Layout from "./Layout.vue";
import "./index.css";

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component("HomePage", HomePage);
  },
} satisfies Theme;
