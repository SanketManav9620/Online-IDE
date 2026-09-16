<template>
  <div style="font-family: sans-serif; text-align: center; padding: 2rem;">
    <h1>⚡ VibeCode Vue Starter</h1>
    <button @click="count++" style="padding: 0.5rem 1rem; font-size: 1rem;">Count is: {{ count }}</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>
