import { defineConfig } from "vitepress";
import { npmCommandsMarkdownPlugin } from "vitepress-plugin-npm-commands";
import { tabsMarkdownPlugin } from "vitepress-plugin-tabs";

import { vpInstallCommandsMarkdownPlugin } from "./plugins/vp-install-tabs";

const logoUrl = "/mark.svg";
const repositoryUrl = "https://github.com/Justineo/swrv-next";

export default defineConfig({
  appearance: true,
  title: "SWRV",
  description: "Stale-while-revalidate data fetching for Vue",
  lang: "en-US",
  cleanUrls: true,
  lastUpdated: true,
  markdown: {
    theme: {
      light: "night-owl-light",
      dark: "night-owl",
    },
    config(md) {
      md.use(tabsMarkdownPlugin);
      md.use(npmCommandsMarkdownPlugin);
      md.use(vpInstallCommandsMarkdownPlugin);
    },
  },
  head: [
    ["meta", { content: "#ffffff", media: "(prefers-color-scheme: light)", name: "theme-color" }],
    ["meta", { content: "#000000", media: "(prefers-color-scheme: dark)", name: "theme-color" }],
    ["link", { href: logoUrl, rel: "icon", type: "image/svg+xml" }],
  ],
  themeConfig: {
    logo: {
      alt: "SWRV logo",
      src: logoUrl,
    },
    search: {
      provider: "local",
    },
    nav: [
      { text: "Docs", link: "/getting-started" },
      { text: "API", link: "/api" },
      { text: "Migrate from v1", link: "/migrate-from-v1" },
      { text: "GitHub", link: repositoryUrl },
    ],
    socialLinks: [{ icon: "github", link: repositoryUrl }],
    footer: {
      message: "Released under the Apache-2.0 License.",
      copyright: "Copyright © 2020-present Kong, Inc.",
    },
    lastUpdatedText: "Last updated",
    outlineTitle: "On this page",
    returnToTopLabel: "Back to top",
    sidebarMenuLabel: "Menu",
    darkModeSwitchLabel: "Theme",
    lightModeSwitchTitle: "Switch to light mode",
    darkModeSwitchTitle: "Switch to dark mode",
    docFooter: {
      prev: "Previous page",
      next: "Next page",
    },
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Getting started", link: "/getting-started" },
          { text: "API", link: "/api" },
          { text: "Arguments", link: "/arguments" },
          { text: "Conditional fetching", link: "/conditional-fetching" },
          { text: "Data fetching", link: "/data-fetching" },
          { text: "Error handling", link: "/error-handling" },
          { text: "Global configuration", link: "/global-configuration" },
          { text: "Revalidation", link: "/revalidation" },
          { text: "Middleware", link: "/middleware" },
          { text: "Mutation", link: "/mutation" },
          { text: "Pagination", link: "/pagination" },
          { text: "Prefetching", link: "/prefetching" },
          { text: "Subscription", link: "/subscription" },
          { text: "TypeScript", link: "/typescript" },
          { text: "Server rendering and hydration", link: "/server-rendering-and-hydration" },
          { text: "Migrate from v1", link: "/migrate-from-v1" },
        ],
      },
      {
        text: "Advanced",
        items: [
          { text: "Understanding SWRV", link: "/advanced/understanding" },
          { text: "Cache", link: "/advanced/cache" },
          { text: "Performance", link: "/advanced/performance" },
          { text: "Devtools", link: "/advanced/devtools" },
        ],
      },
    ],
    outline: [2, 3],
  },
});
