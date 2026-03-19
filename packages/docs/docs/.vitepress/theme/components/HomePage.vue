<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

const homeNav = [
  { href: "/getting-started", label: "Docs" },
  { href: "/api", label: "API" },
  { href: "/migrate-from-v1", label: "Migrate from v1" },
  { href: "https://github.com/Kong/swrv", label: "GitHub" },
];

const isDark = ref(false);

const appearanceLabel = computed(() =>
  isDark.value ? "Switch to light mode" : "Switch to dark mode",
);
const appearanceSymbol = computed(() => (isDark.value ? "☀" : "☾"));

onMounted(() => {
  isDark.value = document.documentElement.classList.contains("dark");
});

function toggleAppearance() {
  if (typeof window === "undefined") {
    return;
  }

  const nextAppearance = isDark.value ? "light" : "dark";

  window.localStorage.setItem("vitepress-theme-appearance", nextAppearance);
  document.documentElement.classList.toggle("dark", nextAppearance === "dark");
  isDark.value = nextAppearance === "dark";
}
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
      <button
        :aria-label="appearanceLabel"
        :title="appearanceLabel"
        class="home-appearance"
        type="button"
        @click="toggleAppearance"
      >
        <span class="home-appearance__track">
          <span class="home-appearance__thumb">{{ appearanceSymbol }}</span>
        </span>
      </button>
    </header>

    <section class="home-hero">
      <div class="home-hero__copy">
        <p class="home-kicker">An open source Kong project</p>
        <h1>Stale-while-revalidate for Vue.</h1>
        <p class="home-lead">
          SWRV follows SWR closely while staying native to Vue composables, refs, and explicit cache
          boundaries.
        </p>
        <div class="home-links">
          <a class="home-link home-link--primary" href="/getting-started">Get started</a>
          <a class="home-link" href="/api">API</a>
        </div>
        <div class="home-install">
          <span class="home-install__label">Install</span>
          <code>vp add swrv vue</code>
        </div>
      </div>

      <aside class="home-sample">
        <p class="home-sample__label">Basic usage</p>
        <div class="home-code">
          <pre><code>&lt;script setup lang="ts"&gt;
import useSWRV from "swrv";

const fetcher = (url: string) =&gt; fetch(url).then((response) =&gt; response.json());

const { data, error, isLoading } = useSWRV("/api/user", fetcher);
&lt;/script&gt;

&lt;template&gt;
  &lt;p v-if="error"&gt;Failed to load.&lt;/p&gt;
  &lt;p v-else-if="isLoading"&gt;Loading…&lt;/p&gt;
  &lt;p v-else&gt;Hello {{ data?.name }}&lt;/p&gt;
&lt;/template&gt;</code></pre>
        </div>
        <p class="home-sample__note">Use it inside setup. Read it like SWR.</p>
      </aside>
    </section>
  </main>
</template>
