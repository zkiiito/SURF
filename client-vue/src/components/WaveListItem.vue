<template>
  <RouterLink :to="`/wave/${wave._id}`" class="waveitem">
    <h2>{{ wave.title }}</h2>
    <p class="meta mhide">
      <span class="usercount R">{{ userCount }} {{ t('participants') }}</span>
      <span class="piros" v-if="unreadCount > 0">{{ unreadCount }}</span>
    </p>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { Wave } from '@/types'
import { useWaveStore } from '@/stores/wave'
import { useMessageStore } from '@/stores/message'
import { t } from '@/utils/i18n'

interface Props {
  wave: Wave
}

const props = defineProps<Props>()

const waveStore = useWaveStore()
const messageStore = useMessageStore()

const userCount = computed(() => props.wave.userIds.length)
const unreadCount = computed(() => waveStore.getWaveUnreadCount(props.wave._id))
</script>

