<template>
  <div id="editwave" class="overlay">
    <div class="overlay-title">
      <a class="close button R" href="#" @click.prevent="appStore.closeEditWave()">
        {{ t('Close') }}
      </a>
      <h2 class="R">{{ isEditing ? t('Edit conversation') : t('Add conversation') }}</h2>
    </div>
    <div class="overlay-body">
      <h2 class="R">{{ isEditing ? t('Edit conversation') : t('Add conversation') }}</h2>
      <form method="post" @submit.prevent="handleSubmit">
        <div>
          <label for="editwave-title" class="R">{{ t('Title') }}</label>
          <div class="right">
            <input 
              id="editwave-title" 
              v-model="title" 
              class="normal" 
              name="title" 
              type="text" 
              required
              ref="titleInput"
            >
          </div>
        </div>
        
        <div>
          <label for="editwave-users" class="R">{{ t('Participants') }}</label>
          <div class="right">
            <select 
              id="editwave-users" 
              v-model="selectedUserIds" 
              class="normal" 
              multiple
              size="5"
            >
              <option 
                v-for="user in availableUsers" 
                :key="user._id" 
                :value="user._id"
              >
                {{ user.name }}
              </option>
            </select>
            <p style="font-size: 0.9em; color: #666;">Hold Ctrl/Cmd to select multiple users</p>
          </div>
        </div>
        
        <div class="right">
          <button id="editwave-submit" type="submit" class="button R">
            {{ isEditing ? t('Save') : t('Create') }}
          </button>
          <button 
            v-if="isEditing" 
            id="editwave-invite" 
            type="button"
            class="button R" 
            @click="handleGetInviteCode"
            :style="{ display: showInviteButton ? 'inline-block' : 'none' }"
          >
            {{ t('Get invite code') }}
          </button>
        </div>
        <br style="clear:both">
        
        <div id="editwave-invitecode-block" v-if="inviteCode">
          <label for="editwave-invitecode" class="R">{{ t('Invite URL') }}</label>
          <div class="right">
            <input 
              id="editwave-invitecode" 
              class="normal" 
              type="text" 
              readonly 
              :value="inviteCode"
              @focus="($event.target as HTMLInputElement)?.select()"
            >
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useWaveStore } from '@/stores/wave'
import { useAppStore } from '@/stores/app'
import { communicator } from '@/services/communicator'
import { t } from '@/utils/i18n'

const userStore = useUserStore()
const waveStore = useWaveStore()
const appStore = useAppStore()

const title = ref('')
const selectedUserIds = ref<string[]>([])
const inviteCode = ref('')
const showInviteButton = ref(true)
const titleInput = ref<HTMLInputElement>()

const isEditing = computed(() => appStore.editingWaveId !== null)

const currentWave = computed(() => {
  if (!appStore.editingWaveId) return null
  return waveStore.getWave(appStore.editingWaveId)
})

const availableUsers = computed(() => {
  return userStore.allUsers
})

function handleInviteCodeReady(event: CustomEvent) {
  const detail = event.detail as { waveId: string; code: string }
  if (detail.waveId === appStore.editingWaveId) {
    showInviteButton.value = false
    inviteCode.value = `${window.location.protocol}//${window.location.host}/invite/${detail.code}`
  }
}

onMounted(() => {
  window.addEventListener('inviteCodeReady', handleInviteCodeReady as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('inviteCodeReady', handleInviteCodeReady as EventListener)
})

// Reset form when opening/closing
watch(() => appStore.showEditWave, async (show) => {
  if (show) {
    inviteCode.value = ''
    showInviteButton.value = true
    
    if (currentWave.value) {
      // Editing existing wave
      title.value = currentWave.value.title
      selectedUserIds.value = [...currentWave.value.userIds]
    } else {
      // Creating new wave
      title.value = ''
      selectedUserIds.value = userStore.currentUser ? [userStore.currentUser._id] : []
    }
    
    await nextTick()
    titleInput.value?.focus()
  }
})

function handleSubmit() {
  if (currentWave.value) {
    // Update existing wave
    communicator.updateWave(currentWave.value._id, title.value, selectedUserIds.value)
  } else {
    // Create new wave
    communicator.createWave(title.value, selectedUserIds.value)
  }
  
  appStore.closeEditWave()
}

function handleGetInviteCode() {
  if (currentWave.value) {
    communicator.getInviteCode(currentWave.value._id)
  }
}
</script>

<style scoped>
#editwave-users {
  width: 100%;
}
</style>

