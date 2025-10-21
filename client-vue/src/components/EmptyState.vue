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
import { useAppStore } from '@/stores/app'
import { t } from '@/utils/i18n'

const appStore = useAppStore()
</script>

