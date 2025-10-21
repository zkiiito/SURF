<template>
  <div class="empty">
    <div class="feedback">
      <h2 class="R">{{ t('You have no conversations.') }}</h2>
      <a class="button addwave R" href="#" @click.prevent="appStore.openEditWave()">
        {{ t('Add conversation +') }}
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWaveStore } from '@/stores/wave'
import { useAppStore } from '@/stores/app'
import { t } from '@/utils/i18n'

const router = useRouter()
const waveStore = useWaveStore()
const appStore = useAppStore()

onMounted(() => {
  // If there are waves, redirect to the last one
  if (waveStore.activeWaves.length > 0) {
    const lastWave = waveStore.activeWaves[waveStore.activeWaves.length - 1]
    router.push(`/wave/${lastWave._id}`)
  }
})
</script>

