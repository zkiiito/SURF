import { computed, makeObservable, observable, runInAction } from 'mobx'
import { Message, sortMessages } from './Message'
import WaveStore, { WaveDTO } from './WaveStore'
import { User } from './User'

export class Wave {
  _id: string
  title: string
  userIds: []
  messages: Message[]
  currentMessage?: Message
  repliedMessage?: Message

  private store: WaveStore

  constructor(dto: WaveDTO, store: WaveStore) {
    this.store = store
    this._id = dto._id
    this.title = dto.title
    this.userIds = dto.userIds
    this.messages = []

    makeObservable(this, {
      title: observable,
      userIds: observable,
      messages: observable,
      currentMessage: observable,
      repliedMessage: observable,
      rootMessages: computed,
      archived: computed,
      users: computed,
      isActive: computed,
    })
  }

  get users(): User[] {
    return this.userIds
      .map((userId) => this.store.users.find((u) => u._id === userId)!)
      .filter(Boolean)
  }

  get rootMessages() {
    return this.messages.filter((m) => !m.parentId).sort(sortMessages)
  }

  get archived() {
    const now = Date.now()
    const firstNewMessage = this.messages.find(
      (message) =>
        now - message.created_at_date.getTime() < 7 * (1000 * 60 * 60 * 24)
    )
    return !!firstNewMessage
  }

  update(dto: WaveDTO) {
    this.title = dto.title
    this.userIds = dto.userIds
  }

  setCurrentMessage(message: Message) {
    runInAction(() => {
      message.unread = false
      this.currentMessage = message
    })
    this.store.readMessage(message)
  }

  setRepliedMessage(message?: Message) {
    runInAction(() => {
      this.repliedMessage = message
    })
  }

  jumpToNextUnread() {
    const nextMessage = this.getNextUnreadMessage()
    if (nextMessage) {
      this.setCurrentMessage(nextMessage)
    } else {
      console.log('no next unread')
    }
  }

  private getNextUnreadMessage() {
    let minTimeStamp = ''
    let nextUnread: Message | null

    if (this.currentMessage) {
      minTimeStamp = this.currentMessage.created_at

      //if we have a current message, check its children, then its parents recursive
      nextUnread = this.getMessageNextUnread(
        this.currentMessage,
        minTimeStamp,
        false,
        []
      )

      if (nextUnread) {
        return nextUnread
      }

      minTimeStamp = this.getMessageRoot(this.currentMessage).created_at
    }

    // if no unread found around the current, or no current, check the main thread, for all root elements below the current root
    const msgs = this.rootMessages.filter(
      (msg) => msg.created_at > minTimeStamp
    )
    for (let i = 0; i < msgs.length; i++) {
      nextUnread = this.getMessageNextUnread(msgs[i], minTimeStamp, true, [])
      if (nextUnread) {
        return nextUnread
      }
    }

    // if none found, check root elements from the top
    if (minTimeStamp) {
      const msgs = this.rootMessages.filter((msg) => {
        return msg.created_at < minTimeStamp
      })

      for (let i = 0; i < msgs.length; i++) {
        nextUnread = this.getMessageNextUnread(msgs[i], '', true, [])
        if (nextUnread) {
          return nextUnread
        }
      }
    }
    return null
  }

  private getMessageNextUnread(
    message: Message,
    minTimeStamp: string,
    downOnly: boolean,
    checkedTimeStamps: string[]
  ): Message | null {
    /*
      console.log('getMessageNextUnread', {
        message: message.message,
        minTimeStamp,
        downOnly,
        checkedTimeStamps,
      })
      */

    if (checkedTimeStamps.includes(message.created_at)) {
      return null
    }

    //check message
    checkedTimeStamps.push(message.created_at)

    if (message.created_at > minTimeStamp && message.unread) {
      return message
    }

    //check children
    for (let i = 0; i < message.messages.length; i++) {
      const nextUnread = this.getMessageNextUnread(
        message.messages[i],
        minTimeStamp,
        true,
        checkedTimeStamps
      )
      if (nextUnread) {
        return nextUnread
      }
    }

    //check parent
    if (message.parentId && !downOnly) {
      const parentMessage = this.messages.find(
        (msg) => msg._id === message.parentId
      )
      if (parentMessage) {
        return this.getMessageNextUnread(
          parentMessage,
          minTimeStamp,
          false,
          checkedTimeStamps
        )
      }
    }

    return null
  }

  private getMessageRoot(message: Message): Message {
    if (message.parentId) {
      const parentMessage = this.messages.find(
        (msg) => msg._id === message.parentId
      )
      if (parentMessage) {
        return this.getMessageRoot(parentMessage)
      }
      return message
    }
    return message
  }

  sendMessage(message: string, parentId?: string) {
    const msg = {
      userId: this.store.currentUser?._id,
      waveId: this._id,
      message: message,
      parentId: parentId,
    }
    this.store.socket.emit('message', msg)
  }

  readAllMessages() {
    runInAction(() => {
      this.messages.forEach((message) => (message.unread = false))
    })
    this.store.socket.emit('readAllMessages', { waveId: this._id })
  }

  getMessages(minParentId: string | null, maxRootId: string) {
    const data = {
      waveId: this._id,
      minParentId: minParentId,
      maxRootId: maxRootId,
    }

    this.store.socket.emit('getMessages', data)
  }

  get isActive() {
    return this.store.currentWave === this
  }
}
