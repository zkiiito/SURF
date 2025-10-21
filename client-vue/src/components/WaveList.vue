<template>
  <div id="wave-list" :class="{ open: appStore.showWaveList }">
    <a class="button addwave" href="#" @click.prevent="appStore.openEditWave()">
      <span class="R mhide">{{ t('Add conversation +') }}</span>
      <span class="R mshow">{{ t('Add+') }}</span>
    </a>
    
    <div id="wave-list-active" v-if="waveStore.activeWaves.length > 0">
      <WaveListItem
        v-for="wave in waveStore.activeWaves"
        :key="wave._id"
        :wave="wave"
      />
    </div>
    
    <div id="wave-list-archived" v-if="waveStore.archivedWaves.length > 0">
      <WaveListItem
        v-for="wave in waveStore.archivedWaves"
        :key="wave._id"
        :wave="wave"
      />
    </div>
    
    <div id="wavelist-bottom">
      <p>SURF &copy; 2023 <a href="http://zkiiito.github.io/SURF/" target="_blank">the SURF team</a></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useWaveStore } from '@/stores/wave'
import { useAppStore } from '@/stores/app'
import { t } from '@/utils/i18n'
import WaveListItem from './WaveListItem.vue'

const waveStore = useWaveStore()
const appStore = useAppStore()
</script>

