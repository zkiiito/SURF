<template>
  <div id="header">
    <h1>SURF</h1>
    <a href="#" @click.prevent="toggleMenu">
      <img id="header-logo" src="/images/surf-logo.png" alt="SURF">
    </a>
    <div id="usermenu" v-if="userStore.currentUser">
      <span id="currentuser">
        <UserAvatar :user="userStore.currentUser" />
        <p class="currentuser_name">{{ userStore.currentUser.name }}</p>
      </span>
      <a class="button edituser" href="#" @click.prevent="appStore.openEditUser()">
        <span class="R mhide">{{ t('Edit profile') }}</span>
        <span class="mshow">⚙</span>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { t } from '@/utils/i18n'
import UserAvatar from './UserAvatar.vue'

const userStore = useUserStore()
const appStore = useAppStore()

function toggleMenu() {
  if (appStore.isMobile) {
    appStore.toggleWaveList()
  }
}
</script>

