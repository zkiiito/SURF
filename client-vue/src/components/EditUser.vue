<template>
  <div id="edituser" class="overlay">
    <div class="overlay-title">
      <a class="close button R" href="#" @click.prevent="appStore.closeEditUser()">
        {{ t('Close') }}
      </a>
      <h2 class="R">{{ t('Edit profile') }}</h2>
    </div>
    <div class="overlay-body">
      <h2 class="R">{{ t('Edit profile') }}</h2>
      <form method="post" @submit.prevent="handleSubmit">
        <div class="edituser-name-row">
          <label for="edituser-name" class="R">{{ t('Name') }}</label>
          <div class="right">
            <input 
              id="edituser-name" 
              v-model="name" 
              class="normal" 
              name="name" 
              type="text" 
              maxlength="30" 
              required
            >
          </div>
        </div>
        
        <div class="ediutuser-avatar-row">
          <label for="edituser-avatar-cb" class="R">{{ t('Avatar') }}</label>
          <div class="right">
            <div v-for="avatarName in avatars" :key="avatarName" class="avatar">
              <label>
                <img :src="`/images/${avatarName}.png`" width="80"><br>
                <input 
                  type="radio" 
                  :value="avatarName" 
                  v-model="avatar" 
                  name="edituser-avatar-cb" 
                  required
                >
              </label>
            </div>
          </div>
        </div>
        
        <div class="edituser-notification-row">
          <label class="R">{{ t('Notifications') }}</label>
          <div class="right">
            <span id="edituser-notification-status">{{ notificationStatus }}</span>
            <button type="button" id="edituser-notification-test" class="R" @click="testNotification">
              {{ t('Test') }}
            </button>
          </div>
        </div>
        
        <div class="edituser-localsettings-row">
          <label class="R">Local settings</label>
          <div class="right">
            <label>
              <input type="checkbox" id="edituser-show-pictures" v-model="showPictures">
              {{ t('Show pictures') }}
            </label><br style="clear: both">
            <label>
              <input type="checkbox" id="edituser-show-videos" v-model="showVideos">
              {{ t('Show videos') }}
            </label><br style="clear: both">
            <label>
              <input type="checkbox" id="edituser-show-linkpreviews" v-model="showLinkPreviews">
              {{ t('Show link previews') }}
            </label>
          </div>
        </div>
        
        <div class="right">
          <button id="edituser-submit" type="submit" class="button R">
            {{ t('Save') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { communicator } from '@/services/communicator'
import { t } from '@/utils/i18n'

const userStore = useUserStore()
const appStore = useAppStore()

const avatars = ['head1', 'head2', 'head3', 'head4', 'head5', 'head6']

const name = ref('')
const avatar = ref('')
const showPictures = ref(true)
const showVideos = ref(true)
const showLinkPreviews = ref(true)

const notificationStatus = computed(() => {
  if (!('Notification' in window)) {
    return t('Not supported')
  }
  return Notification.permission === 'granted' ? t('Enabled') : t('Disabled')
})

// Initialize form with current user data
watch(() => userStore.currentUser, (user) => {
  if (user) {
    name.value = user.name
    avatar.value = user.avatar
    showPictures.value = user.showPictures ?? true
    showVideos.value = user.showVideos ?? true
    showLinkPreviews.value = user.showLinkPreviews ?? true
  }
}, { immediate: true })

function handleSubmit() {
  if (!userStore.currentUser) return
  
  // Update user on server
  communicator.updateUser(name.value, avatar.value)
  
  // Update local settings
  userStore.updateUser(userStore.currentUser._id, {
    showPictures: showPictures.value,
    showVideos: showVideos.value,
    showLinkPreviews: showLinkPreviews.value
  })
  
  userStore.saveLocalAttributes()
  
  appStore.closeEditUser()
}

function testNotification() {
  if (!('Notification' in window)) {
    alert(t('Not supported'))
    return
  }
  
  if (Notification.permission === 'granted') {
    new Notification('SURF Test', {
      body: 'Notifications are working!',
      icon: '/images/surf-ico.png'
    })
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification('SURF Test', {
          body: 'Notifications are working!',
          icon: '/images/surf-ico.png'
        })
      }
    })
  }
}
</script>

