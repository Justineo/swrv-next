<script setup lang="ts">
const homeNav = [
  { href: "/getting-started", label: "Docs" },
  { href: "/api", label: "API" },
  { href: "/migrate-from-v1", label: "Migrate from v1" },
  { href: "https://github.com/Kong/swrv", label: "GitHub" },
];

const guideColumns = [
  {
    links: [
      {
        description: "Install the package, define a fetcher, and render the first request.",
        href: "/getting-started",
        label: "Getting started",
      },
      {
        description: "Understand the return shape, config surface, and core options.",
        href: "/api",
        label: "API",
      },
      {
        description: "Model string, tuple, object, and function keys cleanly.",
        href: "/arguments-and-keys",
        label: "Arguments and keys",
      },
    ],
    title: "Learn the model",
  },
  {
    links: [
      {
        description: "Control focus, reconnect, mount, and polling revalidation.",
        href: "/automatic-revalidation",
        label: "Automatic revalidation",
      },
      {
        description: "Handle optimistic updates, manual mutation, and shared cache writes.",
        href: "/mutation-and-revalidation",
        label: "Mutation and revalidation",
      },
      {
        description: "Scale list and cursor-based data flows without leaving the cache model.",
        href: "/pagination",
        label: "Pagination",
      },
      {
        description: "Attach push-based transports without colliding with normal SWRV state.",
        href: "/subscription",
        label: "Subscription",
      },
    ],
    title: "Build data flows",
  },
  {
    links: [
      {
        description: "Set provider boundaries, fallback data, and shared fetchers.",
        href: "/global-configuration",
        label: "Global configuration",
      },
      {
        description: "Carry data across SSR with explicit Vue-first hydration helpers.",
        href: "/server-rendering-and-hydration",
        label: "Server rendering and hydration",
      },
      {
        description: "Move cleanly from the legacy release line into the rewritten runtime.",
        href: "/migrate-from-v1",
        label: "Migrate from v1",
      },
    ],
    title: "Operate the runtime",
  },
];

const productSignals = [
  {
    body: "Follow SWR semantics closely while returning Vue refs and keeping setup ergonomics intact.",
    title: "SWR-aligned",
  },
  {
    body: "Scope cache state, middleware, mutate, and preload helpers per provider instead of relying on globals.",
    title: "Scoped by design",
  },
  {
    body: "Maintain the Vue library as an open source Kong project with release, test, and packaging discipline.",
    title: "Built to ship",
  },
];
</script>

<template>
  <main class="home-page">
    <header class="home-header">
      <a class="home-header__brand" href="/">
        <img alt="SWRV" src="/mark.svg" />
        <span>SWRV</span>
      </a>
      <nav aria-label="Home" class="home-header__nav">
        <a v-for="item in homeNav" :key="item.href" :href="item.href">{{ item.label }}</a>
      </nav>
    </header>

    <section class="home-hero">
      <div class="home-hero__copy">
        <p class="home-kicker">An open source Kong project</p>
        <h1>Stale-while-revalidate for Vue.</h1>
        <p class="home-lead">
          SWRV brings the SWR data model into Vue with provider-scoped cache boundaries, typed
          companion APIs, and a runtime that feels native inside Vue applications instead of copied
          from React.
        </p>
        <div class="home-actions">
          <a class="home-action home-action--primary" href="/getting-started">Get started</a>
          <a class="home-action" href="/api">Read the API</a>
          <a class="home-action" href="/migrate-from-v1">Migrate from v1</a>
        </div>
        <div class="home-install">
          <span class="home-install__label">Install</span>
          <code>vp add swrv vue</code>
        </div>
      </div>

      <aside class="home-hero__panel">
        <img alt="SWRV" class="home-mark" src="/mark.svg" />
        <div class="home-code">
          <pre><code>import useSWRV from "swrv";

const { data, error, isLoading } = useSWRV(
  () =&gt; token.value ? ["/api/user", token.value] as const : null,
  async (url, token) =&gt; {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.json();
  },
);</code></pre>
        </div>
        <ul class="home-panel-list">
          <li>Vue refs, not React render state</li>
          <li>Scoped cache providers and helpers</li>
          <li>Mutation, infinite, immutable, and subscription APIs</li>
        </ul>
      </aside>
    </section>

    <section class="home-signals" aria-label="Project signals">
      <article v-for="item in productSignals" :key="item.title" class="home-signal">
        <h2>{{ item.title }}</h2>
        <p>{{ item.body }}</p>
      </article>
    </section>

    <section class="home-guides">
      <div class="home-section-heading">
        <p class="home-kicker">Documentation</p>
        <h2>Read the docs with the same mental model as SWR.</h2>
        <p>
          The structure follows the upstream SWR docs, while the examples and platform guidance stay
          specific to Vue and the current SWRV runtime.
        </p>
      </div>
      <div class="home-guide-grid">
        <section v-for="column in guideColumns" :key="column.title" class="home-guide-column">
          <h3>{{ column.title }}</h3>
          <div class="home-guide-list">
            <a
              v-for="link in column.links"
              :key="link.href"
              :href="link.href"
              class="home-guide-link"
            >
              <span class="home-guide-link__label">{{ link.label }}</span>
              <span class="home-guide-link__description">{{ link.description }}</span>
            </a>
          </div>
        </section>
      </div>
    </section>

    <section class="home-closing">
      <div class="home-closing__note">
        <p class="home-kicker">Maintained by Kong</p>
        <p>
          SWRV is maintained as an open source Kong project. The design here stays restrained on
          purpose: minimal chrome, compact code examples, and a documentation rhythm that gets out
          of the way when you are trying to ship.
        </p>
      </div>
    </section>
  </main>
</template>
