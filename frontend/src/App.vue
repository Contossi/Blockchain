<script setup>
import { useCounterStore } from './stores/counter'

const counter = useCounterStore()
</script>

<template>
  <main>
    <h1>Moj projekt</h1>
    <p>Frontend: Vue 3 + Pinia + Vite</p>
    <button @click="counter.increment">Klikovi: {{ counter.count }}</button>
  </main>
</template>
