<script setup lang="ts">
import DefaultTheme from "vitepress/theme";

const { Layout } = DefaultTheme;
</script>

<template>
  <div class="swrv-layout">
    <div aria-hidden="true" class="swrv-layout__frame">
      <div class="swrv-layout__line swrv-layout__line--top"></div>
      <div class="swrv-layout__line swrv-layout__line--left"></div>
    </div>
    <Layout />
  </div>
</template>
