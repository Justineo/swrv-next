<script setup lang="ts">
import DefaultTheme from "vitepress/theme";

const { Layout } = DefaultTheme;
</script>

<template>
  <div class="swrv-layout">
    <div aria-hidden="true" class="swrv-layout__ambient">
      <div class="swrv-layout__orb swrv-layout__orb--sea"></div>
      <div class="swrv-layout__orb swrv-layout__orb--ember"></div>
      <div class="swrv-layout__grid"></div>
    </div>
    <Layout />
  </div>
</template>
