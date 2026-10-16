<script setup lang="ts">
const route = useRoute();
const userId = route.params.id;
</script>

<template>
  <div>
    <h1>User Profile</h1>
    <p>Viewing user: {{ userId }}</p>
  </div>
</template>
