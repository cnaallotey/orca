<template>
  <div>Home</div>
</template>

<script setup>
const { data: users } = await $fetch('/api/users');
</script>
