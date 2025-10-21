<template>
  <div class="notification replyform">
    <form class="add-message" method="post" @submit.prevent="handleSubmit">
      <textarea
        v-model="message"
        name="message"
        :placeholder="t('Add message')"
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
import { ref } from 'vue'
import { communicator } from '@/services/communicator'
import { t } from '@/utils/i18n'

interface Props {
  waveId: string
}

const props = defineProps<Props>()

const message = ref('')
const textarea = ref<HTMLTextAreaElement>()

function handleSubmit() {
  if (!message.value.trim()) return
  
  communicator.sendMessage(message.value, props.waveId, null)
  message.value = ''
  
  // Focus back on textarea
  textarea.value?.focus()
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSubmit()
  }
}
</script>

