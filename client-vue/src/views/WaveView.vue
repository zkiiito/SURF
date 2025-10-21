<template>
  <div class="wave" v-if="wave">
    <div class="wavetop">
      <h2 class="wave-title">{{ wave.title }}</h2>
      <p class="heads">
        <UserAvatar 
          v-for="user in waveUsers" 
          :key="user._id" 
          :user="user"
        />
        <p class="offline-list" v-if="offlineCount > 0">
          +<span class="count">{{ offlineCount }}</span>
          <span class="mhide"> offline</span>
        </p>
      </p>
      <div class="buttons">
        <a class="button gounread R mhide" href="#" @click.prevent="scrollToNextUnread">
          {{ t('Next unread') }}
        </a>
        <a class="button editwave R mhide" href="#" @click.prevent="handleEditWave">
          {{ t('Edit') }}
        </a>
        <a class="button readall R mhide" href="#" @click.prevent="handleReadAll">
          {{ t('All read') }}
        </a>
        <a class="button quit" href="#" @click.prevent="handleQuit">
          <span class="R mhide">{{ t('Leave conversation') }}</span>
          <span class="mshow">✖</span>
        </a>
      </div>
    </div>
    
    <div class="waves-container" ref="wavesContainer">
      <div class="messages">
        <div class="notification getprevmessages">
          <p>
            <a class="getprevmessages R" href="#" @click.prevent="handleGetPreviousMessages">
              {{ t('Earlier messages') }}
            </a>
          </p>
        </div>
        
        <MessageItem
          v-for="message in rootMessages"
          :key="message._id"
          :message="message"
          @reply="handleReply"
        />
      </div>
      
      <WaveReplyForm :wave-id="wave._id" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWaveStore } from '@/stores/wave'
import { useMessageStore } from '@/stores/message'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { communicator } from '@/services/communicator'
import { t } from '@/utils/i18n'
import UserAvatar from '@/components/UserAvatar.vue'
import MessageItem from '@/components/MessageItem.vue'
import WaveReplyForm from '@/components/WaveReplyForm.vue'

interface Props {
  id: string
}

const props = defineProps<Props>()

const waveStore = useWaveStore()
const messageStore = useMessageStore()
const userStore = useUserStore()
const appStore = useAppStore()
const router = useRouter()

const wavesContainer = ref<HTMLElement>()

const wave = computed(() => waveStore.getWave(props.id))

const rootMessages = computed(() => {
  if (!wave.value) return []
  return messageStore.getRootMessagesByWave(wave.value._id)
})

const waveUsers = computed(() => {
  if (!wave.value) return []
  return waveStore.getWaveUsers(wave.value._id)
})

const offlineCount = computed(() => {
  return waveUsers.value.filter(u => u.status === 'offline').length
})

function scrollToNextUnread() {
  if (!wave.value) return
  
  const nextUnread = messageStore.getNextUnreadInWave(wave.value._id)
  if (nextUnread) {
    const messageEl = document.getElementById(`msg-${nextUnread._id}`)
    if (messageEl && wavesContainer.value) {
      const scrollTop = messageEl.offsetTop - wavesContainer.value.offsetTop
      wavesContainer.value.scrollTop = scrollTop
      
      // Mark as read
      communicator.readMessage(nextUnread._id, nextUnread.waveId)
      messageStore.markAsRead(nextUnread._id)
    }
  } else {
    scrollToBottom()
  }
}

function scrollToBottom() {
  if (wavesContainer.value) {
    wavesContainer.value.scrollTop = wavesContainer.value.scrollHeight
  }
}

function handleEditWave() {
  if (wave.value) {
    appStore.openEditWave(wave.value._id)
  }
}

function handleReadAll() {
  if (!wave.value) return
  
  messageStore.markAllAsReadInWave(wave.value._id)
  communicator.readAllMessages(wave.value._id)
}

function handleQuit() {
  if (!wave.value) return
  
  const question = t('Do you want to leave conversation {{ title }}?\n\nIf you want to come back later, participants can invite you', {
    title: wave.value.title
  })
  
  if (confirm(question)) {
    communicator.quitWave(wave.value._id)
    waveStore.removeWave(wave.value._id)
    
    // Navigate to last wave or home
    const lastWave = waveStore.activeWaves[waveStore.activeWaves.length - 1]
    if (lastWave) {
      router.push(`/wave/${lastWave._id}`)
    } else {
      router.push('/')
    }
  }
}

function handleGetPreviousMessages() {
  if (!wave.value) return
  
  const messages = messageStore.getRootMessagesByWave(wave.value._id)
  if (messages.length > 0) {
    const maxRootId = messages[0]._id
    communicator.getMessages(wave.value._id, null, maxRootId)
  }
}

function handleReply(messageId: string) {
  // Reply functionality handled by MessageItem
}

function handleScrollToNextUnread() {
  scrollToNextUnread()
}

// Auto-scroll to next unread on mount
watch(() => wave.value, async (newWave) => {
  if (newWave) {
    await nextTick()
    scrollToNextUnread()
  }
}, { immediate: true })

// Listen for global scroll to next unread event
onMounted(() => {
  window.addEventListener('scrollToNextUnread', handleScrollToNextUnread)
})

onUnmounted(() => {
  window.removeEventListener('scrollToNextUnread', handleScrollToNextUnread)
})
</script>

