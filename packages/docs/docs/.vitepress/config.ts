import { defineConfig } from "vitepress";

export default defineConfig({
  appearance: false,
  title: "SWRV",
  description: "Stale-while-revalidate data fetching for Vue",
  lang: "en-US",
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ["meta", { content: "#000000", name: "theme-color" }],
    ["meta", { content: "dark", name: "color-scheme" }],
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
      { text: "Revalidation", link: "/automatic-revalidation" },
      { text: "Mutation", link: "/mutation-and-revalidation" },
      { text: "Pagination", link: "/pagination" },
      { text: "Migrate from v1", link: "/migrate-from-v1" },
      { text: "GitHub", link: "https://github.com/Kong/swrv" },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/Kong/swrv" }],
    footer: {
      message: "Maintained by Kong Inc. and the SWRV contributors.",
      copyright: "Released under the Apache-2.0 license.",
    },
    lastUpdatedText: "Last updated",
    outlineTitle: "On this page",
    returnToTopLabel: "Back to top",
    sidebarMenuLabel: "Menu",
    docFooter: {
      prev: "Previous page",
      next: "Next page",
    },
    sidebar: [
      {
        text: "Basics",
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
        text: "Data flow",
        items: [
          { text: "Global configuration", link: "/global-configuration" },
          { text: "Automatic revalidation", link: "/automatic-revalidation" },
          { text: "Mutation and revalidation", link: "/mutation-and-revalidation" },
          { text: "Pagination", link: "/pagination" },
          { text: "Prefetching data", link: "/prefetching-data" },
          { text: "Subscription", link: "/subscription" },
          { text: "Middleware", link: "/middleware" },
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
        text: "Platform",
        items: [
          { text: "TypeScript", link: "/typescript" },
          { text: "Server rendering and hydration", link: "/server-rendering-and-hydration" },
          { text: "Migrate from v1", link: "/migrate-from-v1" },
        ],
      },
    ],
    outline: [2, 3],
  },
});
