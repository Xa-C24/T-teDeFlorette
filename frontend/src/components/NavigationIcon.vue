<script setup>
defineProps({ name: { type: String, required: true } });
</script>

<template>
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <template v-if="name === 'calendar'">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M7 3v4m10-4v4M3 11h18M7 15h2m6 0h2m-10 3h2" />
    </template>
    <template v-else-if="name === 'yesterday'">
      <path d="M3 10a9 9 0 1 1 2 8M3 4v6h6m3-3v5l-3 2" />
    </template>
    <template v-else-if="name === 'today'">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
    </template>
    <template v-else-if="name === 'tomorrow'">
      <path d="M3 17h18M5 13a7 7 0 0 1 14 0M12 2v3M3 6l2 2m14 0 2-2M9 21h6" />
    </template>
    <template v-else-if="name === 'catchall'">
      <rect x="3" y="4" width="18" height="5" rx="1.5" />
      <path d="M5 9v11h14V9m-10 4h6" />
    </template>
  </svg>
</template>
