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
          SWRV follows SWR closely while keeping Vue-native refs, explicit cache boundaries, and a
          runtime that fits naturally into Vue applications.
        </p>
        <div class="home-links">
          <a class="home-link home-link--primary" href="/getting-started">Get started</a>
          <a class="home-link" href="/api">API</a>
          <a class="home-link" href="/migrate-from-v1">Migrate from v1</a>
        </div>
        <div class="home-install">
          <span class="home-install__label">Install</span>
          <code>vp add swrv vue</code>
        </div>
      </div>

      <aside class="home-sample">
        <p class="home-sample__label">Basic usage</p>
        <div class="home-code">
          <pre><code>import useSWRV from "swrv";

const { data, error, isLoading } = useSWRV(
  "/api/user",
  (key) =&gt; fetch(key).then((response) =&gt; response.json()),
);</code></pre>
        </div>
        <p class="home-sample__note">Read the docs like SWR. Use it like Vue.</p>
      </aside>
    </section>
  </main>
</template>
