<template>
  <div class="notification replyform">
    <p>
      <a class="button threadend cancel" href="#" @click.prevent="$emit('cancel')">
        <span class="R">{{ t('Cancel') }}</span> ⤴
      </a>
    </p>
    <form class="add-message threadend" method="post" @submit.prevent="handleSubmit">
      <textarea
        v-model="replyMessage"
        name="message"
        :placeholder="replyPlaceholder"
        class="R"
        @keydown="handleKeyDown"
        ref="textarea"
      ></textarea>
      <p class="inline-help mhide">
        <button type="submit" class="button sendmsg R">
          {{ t('Save message') }}
        </button>
        <span class="R hint">{{ t('Press Return to send, Shift-Return to break line.') }}</span>
      </p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Message } from '@/types'
import { useUserStore } from '@/stores/user'
import { communicator } from '@/services/communicator'
import { t } from '@/utils/i18n'

interface Props {
  message: Message
}

const props = defineProps<Props>()
const emit = defineEmits<{
  cancel: []
  sent: []
}>()

const userStore = useUserStore()

const replyMessage = ref('')
const textarea = ref<HTMLTextAreaElement>()

const messageUser = computed(() => {
  const user = userStore.getUser(props.message.userId)
  return user || { name: 'Unknown' }
})

const replyPlaceholder = computed(() => {
  return t('Reply to message') + ` ${messageUser.value.name}`
})

function handleSubmit() {
  if (!replyMessage.value.trim()) return
  
  communicator.sendMessage(replyMessage.value, props.message.waveId, props.message._id)
  replyMessage.value = ''
  emit('sent')
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSubmit()
  }
}

onMounted(() => {
  textarea.value?.focus()
})
</script>

