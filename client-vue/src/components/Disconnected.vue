<template>
  <div id="disconnected" class="overlay">
    <div class="overlay-title">
      <h2 class="R">{{ t('Disconnected') }}</h2>
    </div>
    <div class="overlay-body">
      <h2 class="R">{{ t("You're disconnected") }}</h2>
      <p class="countdown" v-if="appStore.shouldReconnect">
        <span class="R">{{ t('Retrying in:') }}</span> 
        <span class="counter">{{ counter }}</span>
      </p>
      <a href="/" class="R">{{ t('Reconnect') }}</a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { t } from '@/utils/i18n'

const appStore = useAppStore()
const counter = ref(10)
let interval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  if (appStore.shouldReconnect) {
    interval = setInterval(() => {
      counter.value--
      if (counter.value <= 0) {
        window.location.reload()
      }
    }, 1000)
  }
})

onUnmounted(() => {
  if (interval) {
    clearInterval(interval)
  }
})
</script>

