import { io, Socket } from 'socket.io-client'
import type {
  SocketInitData,
  SocketMessageData,
  SendMessagePayload,
  CreateWavePayload,
  UpdateWavePayload,
  UpdateUserPayload,
  Message
} from '@/types'
import { useUserStore } from '@/stores/userStore'
import { useWaveStore } from '@/stores/waveStore'
import { useMessageStore } from '@/stores/messageStore'
import { useAppStore } from '@/stores/appStore'

class Communicator {
  private socket: Socket | null = null
  private reconnect = true
  private createTitle: string | null = null
  private readQueue: Message[] = []
  private queueReads = false

  initialize() {
    this.socket = io({ reconnection: false })

    this.socket.on('init', (data: SocketInitData) => {
      this.onInit(data)
    })

    this.socket.on('message', (data: SocketMessageData | { messages: SocketMessageData[] }) => {
      this.onMessage(data)
    })

    this.socket.on('disconnect', () => {
      useAppStore.getState().handleDisconnect(this.reconnect)
    })

    this.socket.on('updateUser', (data: { user: any }) => {
      this.onUpdateUser(data)
    })

    this.socket.on('updateWave', (data: { wave: any }) => {
      this.onUpdateWave(data)
    })

    this.socket.on('inviteCodeReady', (data: { waveId: string; code: string }) => {
      this.onInviteCodeReady(data)
    })

    this.socket.on('linkPreviewReady', (data: { msgId: string; data: any }) => {
      this.onLinkPreviewReady(data)
    })

    this.socket.on('dontReconnect', () => {
      this.reconnect = false
    })

    this.socket.on('ready', () => {
      const messageStore = useMessageStore.getState()
      this.queueReads = messageStore.unreadMessages().length > 1
      useAppStore.getState().setReady()
    })
  }

  private onInit(data: SocketInitData) {
    const userStore = useUserStore.getState()
    const waveStore = useWaveStore.getState()

    if (!userStore.currentUser()) {
      const allUsers = [...data.users, data.me]
      userStore.addUsers(allUsers)
      userStore.initCurrentUser(data.me)
      waveStore.addWaves(data.waves)
    }
  }

  sendMessage(message: string, waveId: string, parentId: string | null) {
    const userStore = useUserStore.getState()
    const currentUser = userStore.currentUser()
    if (!currentUser || !this.socket) return

    const msg: SendMessagePayload = {
      userId: currentUser._id,
      waveId,
      message,
      parentId
    }
    this.socket.emit('message', msg)
  }

  readMessage(messageId: string, waveId: string) {
    if (!this.socket) return

    const messageStore = useMessageStore.getState()
    const message = messageStore.getMessage(messageId)
    if (!message) return

    if (this.queueReads) {
      this.readQueue.push(message)
      this.queueReads = false
    } else {
      this.readQueue.forEach(msg => {
        this.socket!.emit('readMessage', { id: msg._id, waveId: msg.waveId })
      })
      this.readQueue = []
      this.socket.emit('readMessage', { id: messageId, waveId })
    }
  }

  readAllMessages(waveId: string) {
    if (!this.socket) return
    this.socket.emit('readAllMessages', { waveId })
  }

  createWave(title: string, userIds: string[]) {
    if (!this.socket) return

    const wave: CreateWavePayload = { title, userIds }
    this.createTitle = title
    this.socket.emit('createWave', wave)
  }

  updateWave(waveId: string, title: string, userIds: string[]) {
    if (!this.socket) return

    const wave: UpdateWavePayload = { id: waveId, title, userIds }
    this.socket.emit('updateWave', wave)
  }

  private onMessage(data: SocketMessageData | { messages: SocketMessageData[] }) {
    const messageStore = useMessageStore.getState()
    const waveStore = useWaveStore.getState()
    const userStore = useUserStore.getState()

    if ('messages' in data && data.messages) {
      data.messages.forEach(msg => this.onMessage(msg))
      return
    }

    const msgData = data as SocketMessageData
    const currentUser = userStore.currentUser()
    
    // Don't mark own messages as unread
    const isOwnMessage = currentUser && msgData.userId === currentUser._id
    
    const message: Message = {
      _id: msgData._id,
      userId: msgData.userId,
      waveId: msgData.waveId,
      message: msgData.message,
      parentId: msgData.parentId,
      created_at: msgData.created_at,
      unread: isOwnMessage ? false : (msgData.unread ?? true)
    }

    const wave = waveStore.getWave(msgData.waveId)
    if (wave) {
      messageStore.addMessage(message)
      waveStore.checkAndArchive(msgData.waveId)
    }
  }

  private onUpdateUser(data: { user: any }) {
    const userStore = useUserStore.getState()
    const user = data.user

    if (userStore.getUser(user._id)) {
      userStore.updateUser(user._id, user)
    } else {
      userStore.addUser(user)
    }
  }

  private onUpdateWave(data: { wave: any }) {
    const waveStore = useWaveStore.getState()
    const wavedata = data.wave

    if (waveStore.getWave(wavedata._id)) {
      waveStore.updateWave(wavedata._id, wavedata)
    } else {
      waveStore.addWave(wavedata)
      
      if (waveStore.allWaves().length === 1 || this.createTitle === wavedata.title) {
        waveStore.setCurrentWave(wavedata._id)
      }
    }
  }

  getMessages(waveId: string, minParentId: string | null, maxRootId: string | null) {
    if (!this.socket) return

    this.socket.emit('getMessages', { waveId, minParentId, maxRootId })
  }

  getUser(userId: string) {
    if (!this.socket) return
    this.socket.emit('getUser', { userId })
  }

  quitWave(waveId: string) {
    if (!this.socket) return
    this.socket.emit('quitWave', { waveId })
  }

  getInviteCode(waveId: string) {
    if (!this.socket) return
    this.socket.emit('createInviteCode', { waveId })
  }

  private onInviteCodeReady(data: { waveId: string; code: string }) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('inviteCodeReady', { detail: data }))
    }
  }

  updateUser(name: string, avatar: string) {
    if (!this.socket) return

    const data: UpdateUserPayload = { name, avatar }
    this.socket.emit('updateUser', data)
  }

  getLinkPreview(url: string, messageId: string) {
    if (!this.socket) return
    this.socket.emit('getLinkPreview', { msgId: messageId, url })
  }

  private onLinkPreviewReady(data: { msgId: string; data: any }) {
    const messageStore = useMessageStore.getState()
    const message = messageStore.getMessage(data.msgId)
    
    if (message) {
      messageStore.addLinkPreview(data.msgId, data.data)
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
    }
  }
}

export const communicator = new Communicator()

