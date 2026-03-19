import { defineConfig } from "vitepress";

export default defineConfig({
  title: "SWRV Next",
  description: "Modern Vue-native stale-while-revalidate data fetching",
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    logo: "/mark.svg",
    nav: [
      { text: "Guide", link: "/guide" },
      { text: "SSR", link: "/ssr" },
      { text: "Examples", link: "/examples" },
      { text: "API", link: "/api" },
      { text: "Status", link: "/status" },
      { text: "Parity", link: "/parity" },
      { text: "Migration", link: "/migration" },
      { text: "GitHub", link: "https://github.com/Kong/swrv" },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/Kong/swrv" }],
    footer: {
      message: "Released under the Apache-2.0 License.",
      copyright: "Copyright © 2026-present SWRV contributors",
    },
    sidebar: [
      {
        text: "Overview",
        items: [
          { text: "What SWRV Next Is", link: "/" },
          { text: "Guide", link: "/guide" },
          { text: "SSR", link: "/ssr" },
          { text: "Examples", link: "/examples" },
          { text: "API", link: "/api" },
          { text: "Status", link: "/status" },
          { text: "Parity", link: "/parity" },
          { text: "Migration", link: "/migration" },
        ],
      },
    ],
    outline: [2, 3],
  },
});
