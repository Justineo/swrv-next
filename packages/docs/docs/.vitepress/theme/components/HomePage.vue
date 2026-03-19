<script setup lang="ts">
const topicCards = [
  {
    description: "Install the package, pick a fetcher shape, and get the first request on screen.",
    href: "/getting-started",
    label: "Get started",
  },
  {
    description:
      "Understand keys, fetchers, refs, return values, and the main configuration surface.",
    href: "/api",
    label: "Read the API",
  },
  {
    description:
      "Tune focus, reconnect, dedupe, polling, and cache boundaries without leaving Vue patterns behind.",
    href: "/global-configuration",
    label: "Configure the runtime",
  },
  {
    description:
      "Handle optimistic updates, pagination, subscriptions, and preload flows with the SWR-shaped companion APIs.",
    href: "/mutation-and-revalidation",
    label: "Model data flows",
  },
];

const capabilityRows = [
  {
    body: "Use SWR as the behavioral reference, but keep Vue refs, setup ergonomics, and explicit cache boundaries.",
    title: "Follow SWR, stay Vue-native",
  },
  {
    body: "Provider-scoped state, pack and publish dry-runs, browser tests, and typed subpath exports are already built into the repo.",
    title: "Ship a real library, not a port",
  },
  {
    body: "Document what is shipped, what is intentionally different, and what is still deferred before the stable release.",
    title: "Keep the project legible for future work",
  },
];

const shippedHighlights = [
  "SWR-aligned base hook semantics for revalidation, dedupe, fallback data, and bound mutate",
  "Companion APIs for immutable, infinite, mutation, and subscription flows",
  "Provider-scoped cache boundaries, preload helpers, and SSR snapshot utilities",
  "A Vite-era monorepo with tests, docs, CI, Renovate, and release automation",
];
</script>

<template>
  <main class="home-page">
    <section class="home-hero">
      <div class="home-hero__copy">
        <p class="home-eyebrow">SWR for Vue, rebuilt with intent</p>
        <h1>Data fetching that follows SWR and feels native in Vue.</h1>
        <p class="home-lead">
          SWRV brings stale-while-revalidate caching, mutation, pagination, and subscriptions into
          Vue with explicit cache boundaries, modern tooling, and a docs model that mirrors SWR
          instead of fighting it.
        </p>
        <div class="home-actions">
          <a class="home-action home-action--primary" href="/getting-started">Get started</a>
          <a class="home-action" href="/api">Read the API</a>
          <a class="home-action" href="/compatibility-and-status">See status</a>
        </div>
        <div class="home-install">
          <span class="home-install__label">Install</span>
          <code>vp add swrv vue</code>
        </div>
      </div>

      <div class="home-hero__stack">
        <section class="hero-panel hero-panel--code">
          <div class="hero-panel__header">
            <span class="hero-dot hero-dot--sea"></span>
            <span class="hero-dot hero-dot--ember"></span>
            <span class="hero-dot hero-dot--fog"></span>
          </div>
          <pre><code>import useSWRV from "swrv";

const { data, error, isLoading } = useSWRV(
  () =&gt; ["/api/user", token.value] as const,
  async (url, token) =&gt; {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
  },
);</code></pre>
        </section>

        <section class="hero-panel hero-panel--list">
          <p class="hero-panel__eyebrow">What this version optimizes for</p>
          <ul>
            <li>Predictable SWR behavior</li>
            <li>Vue-native reactive returns</li>
            <li>Explicit SSR and cache boundaries</li>
            <li>Precise types and broad test coverage</li>
          </ul>
        </section>
      </div>
    </section>

    <section class="home-section">
      <div class="section-heading">
        <p class="home-eyebrow">Why this rewrite exists</p>
        <h2>The old project fell behind. This one is meant to last.</h2>
      </div>
      <div class="capability-grid">
        <article v-for="item in capabilityRows" :key="item.title" class="capability-card">
          <h3>{{ item.title }}</h3>
          <p>{{ item.body }}</p>
        </article>
      </div>
    </section>

    <section class="home-section home-section--map">
      <div class="section-heading">
        <p class="home-eyebrow">Start by task</p>
        <h2>Use the docs the same way a SWR user would.</h2>
      </div>
      <div class="topic-grid">
        <a v-for="item in topicCards" :key="item.href" :href="item.href" class="topic-card">
          <span class="topic-card__label">{{ item.label }}</span>
          <p>{{ item.description }}</p>
        </a>
      </div>
    </section>

    <section class="home-section home-section--status">
      <div class="section-heading">
        <p class="home-eyebrow">Current shape</p>
        <h2>The library is already broad. Stable release work is about refinement, not rescue.</h2>
      </div>
      <div class="status-panel">
        <ul>
          <li v-for="item in shippedHighlights" :key="item">{{ item }}</li>
        </ul>
        <p>
          The remaining pre-stable work is focused on tighter types, one more simplification pass,
          and a full docs and design refresh. Suspense remains intentionally out of the active lane
          until its product scope changes.
        </p>
      </div>
    </section>
  </main>
</template>
