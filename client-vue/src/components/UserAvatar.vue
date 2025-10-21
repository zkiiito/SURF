<template>
  <img 
    :class="user.status" 
    :src="avatarUrl" 
    :alt="user.name" 
    :title="user.name"
  >
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { User } from '@/types'

interface Props {
  user: User
}

const props = defineProps<Props>()

const avatarUrl = computed(() => {
  return `/images/${props.user.avatar}.png`
})
</script>

