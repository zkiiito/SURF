<template>
  <div class="message" :id="`msg-${message._id}`">
    <table :class="{ unread: message.unread }" tabindex="-1" @click="handleRead">
      <tbody>
        <tr>
          <td class="message-header">
            <UserAvatar :user="messageUser" />
          </td>
          <td class="message-body">
            <a class="button reply" href="#" @click.prevent="handleReply">↩</a>
            <p class="time">{{ formattedDate }}</p>
            <p class="message-text">
              <span class="author">{{ messageUser.name }}:</span>
              <span class="message-formatted" v-html="formattedMessage"></span>
            </p>
          </td>
        </tr>
      </tbody>
    </table>
    
    <!-- Link Preview -->
    <table v-if="message.linkPreview && shouldShowLinkPreview">
      <tbody>
        <tr>
          <td class="message-header"></td>
          <td class="message-linkpreview message-body">
            <a :href="message.linkPreview.url" target="_blank">
              <b>{{ message.linkPreview.title }}</b><br>
              <img v-if="message.linkPreview.image" :src="message.linkPreview.image" class="message-img"><br>
              <span>{{ message.linkPreview.description }}</span>
            </a>
          </td>
        </tr>
      </tbody>
    </table>
    
    <!-- Replies -->
    <div class="replies">
      <MessageItem
        v-for="reply in replies"
        :key="reply._id"
        :message="reply"
        @reply="$emit('reply', $event)"
      />
    </div>
    
    <!-- Reply Form -->
    <MessageReplyForm
      v-if="showReplyForm"
      :message="message"
      @cancel="showReplyForm = false"
      @sent="showReplyForm = false"
    />
    
    <!-- Thread End Button -->
    <div class="notification threadend" v-if="!showReplyForm && replies.length > 0">
      <p>
        <a class="button threadend" href="#" @click.prevent="handleReply">
          <span class="R">{{ t('Add message') }}</span> ⤵
        </a>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Message } from '@/types'
import { useMessageStore } from '@/stores/message'
import { useUserStore } from '@/stores/user'
import { communicator } from '@/services/communicator'
import { t } from '@/utils/i18n'
import { nl2br, stripTags } from '@/utils/text'
import UserAvatar from './UserAvatar.vue'
import MessageReplyForm from './MessageReplyForm.vue'

interface Props {
  message: Message
}

const props = defineProps<Props>()
const emit = defineEmits<{
  reply: [messageId: string]
}>()

const messageStore = useMessageStore()
const userStore = useUserStore()

const showReplyForm = ref(false)

const messageUser = computed(() => {
  const user = userStore.getUser(props.message.userId)
  return user || {
    _id: props.message.userId,
    name: 'Unknown',
    avatar: 'head1',
    status: 'offline' as const
  }
})

const replies = computed(() => {
  return messageStore.getReplies(props.message._id)
})

const formattedDate = computed(() => {
  const date = new Date(props.message.created_at)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } else if (diffDays === 1) {
    return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }
})

const formattedMessage = computed(() => {
  let msg = props.message.message
  
  // Strip dangerous HTML but allow some tags
  msg = stripTags(msg, '<b><i><u><a><br>')
  
  // Convert newlines to <br>
  msg = nl2br(msg)
  
  // Make URLs clickable
  msg = msg.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank">$1</a>'
  )
  
  return msg
})

const shouldShowLinkPreview = computed(() => {
  return userStore.currentUser?.showLinkPreviews ?? true
})

function handleRead() {
  if (props.message.unread) {
    communicator.readMessage(props.message._id, props.message.waveId)
    messageStore.markAsRead(props.message._id)
  }
}

function handleReply() {
  showReplyForm.value = !showReplyForm.value
  emit('reply', props.message._id)
}
</script>

<style scoped>
.message {
  margin-bottom: 10px;
}

.message-img {
  max-width: 300px;
  height: auto;
}
</style>

