import { defineConfig } from "vitepress";

export default defineConfig({
  title: "SWRV",
  description: "Stale-while-revalidate data fetching for Vue",
  lang: "en-US",
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ["meta", { content: "#0d1726", name: "theme-color" }],
    ["link", { href: "/mark.svg", rel: "icon", type: "image/svg+xml" }],
  ],
  themeConfig: {
    logo: "/mark.svg",
    search: {
      provider: "local",
    },
    nav: [
      { text: "Getting started", link: "/getting-started" },
      { text: "API", link: "/api" },
      { text: "Mutation", link: "/mutation-and-revalidation" },
      { text: "Pagination", link: "/pagination" },
      { text: "TypeScript", link: "/typescript" },
      { text: "GitHub", link: "https://github.com/Kong/swrv" },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/Kong/swrv" }],
    footer: {
      message: "Released under the Apache-2.0 license.",
      copyright: "Copyright © 2026-present the SWRV contributors",
    },
    lastUpdatedText: "Last updated",
    outlineTitle: "On this page",
    returnToTopLabel: "Back to top",
    sidebarMenuLabel: "Menu",
    darkModeSwitchLabel: "Theme",
    lightModeSwitchTitle: "Switch to light theme",
    darkModeSwitchTitle: "Switch to dark theme",
    docFooter: {
      prev: "Previous page",
      next: "Next page",
    },
    sidebar: [
      {
        text: "Core concepts",
        items: [
          { text: "Home", link: "/" },
          { text: "Getting started", link: "/getting-started" },
          { text: "API", link: "/api" },
          { text: "Arguments and keys", link: "/arguments-and-keys" },
          { text: "Conditional fetching", link: "/conditional-fetching" },
          { text: "Data fetching", link: "/data-fetching" },
          { text: "Error handling", link: "/error-handling" },
        ],
      },
      {
        text: "Configuration and flow control",
        items: [
          { text: "Global configuration", link: "/global-configuration" },
          { text: "Automatic revalidation", link: "/automatic-revalidation" },
          { text: "Prefetching data", link: "/prefetching-data" },
          { text: "Middleware", link: "/middleware" },
          { text: "Mutation and revalidation", link: "/mutation-and-revalidation" },
          { text: "Pagination", link: "/pagination" },
          { text: "Subscription", link: "/subscription" },
        ],
      },
      {
        text: "Advanced",
        items: [
          { text: "Understanding SWRV", link: "/advanced/understanding-swrv" },
          { text: "Cache", link: "/advanced/cache" },
          { text: "Performance", link: "/advanced/performance" },
          { text: "Devtools", link: "/advanced/devtools" },
        ],
      },
      {
        text: "Platform and migration",
        items: [
          { text: "TypeScript", link: "/typescript" },
          { text: "Server rendering and hydration", link: "/server-rendering-and-hydration" },
          { text: "Compatibility and status", link: "/compatibility-and-status" },
          { text: "Migration from SWRV", link: "/migration-from-swrv" },
        ],
      },
    ],
    outline: [2, 3],
  },
});
