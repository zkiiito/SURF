import { computed, makeObservable, observable, runInAction } from 'mobx'
import socketIO from 'socket.io-client'

export interface UserDTO {
  name: string
  avatar: string
  status: string
  facebookId: string
  facebookAvatar: string
  googleId: string
  googleAvatar: string
  _id: string
}

export class User implements UserDTO {
  name: string
  avatar: string
  status: string
  facebookId: string
  facebookAvatar: string
  googleId: string
  googleAvatar: string
  _id: string

  constructor(dto: UserDTO) {
    this._id = dto._id
    this.name = dto.name
    this.avatar = dto.avatar
    this.status = dto.status
    this.facebookId = dto.facebookId
    this.facebookAvatar = dto.facebookAvatar
    this.googleId = dto.googleId
    this.googleAvatar = dto.googleAvatar

    makeObservable(this, {
      name: observable,
      avatar: observable,
      status: observable,
    })
  }

  update(dto: UserDTO) {
    this.name = dto.name
    this.avatar = dto.avatar
    this.status = dto.status
    this.facebookId = dto.facebookId
    this.facebookAvatar = dto.facebookAvatar
    this.googleId = dto.googleId
    this.googleAvatar = dto.googleAvatar
  }
}

export interface CurrentUser extends UserDTO {
  showPictures: boolean
  showVideos: boolean
  showLinkPreviews: boolean
}

export interface WaveDTO {
  _id: string
  title: string
  userIds: []
}

export class Wave implements WaveDTO {
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
    socket.emit('message', msg)
  }

  readAllMessages() {
    runInAction(() => {
      this.messages.forEach((message) => (message.unread = false))
    })
    socket.emit('readAllMessages', { waveId: this._id })
  }

  getMessages(minParentId: string | null, maxRootId: string) {
    const data = {
      waveId: this._id,
      minParentId: minParentId,
      maxRootId: maxRootId,
    }

    socket.emit('getMessages', data)
  }
}

export interface MessageDTO {
  _id: string
  userId: string
  waveId: string
  parentId: string
  message: string
  unread: boolean
  created_at: string
}

export class Message implements MessageDTO {
  _id: string
  userId: string
  waveId: string
  parentId: string
  message: string
  unread: boolean
  created_at: string

  messages: Message[]
  user?: User
  created_at_date: Date
  createdAtFormatted: string

  constructor(dto: MessageDTO, users: User[], currentUser?: User) {
    this._id = dto._id
    this.userId = dto.userId
    this.waveId = dto.waveId
    this.parentId = dto.parentId
    this.message = dto.message
    this.created_at = dto.created_at
    this.messages = []
    this.user = users.find((u) => u._id === dto.userId)
    this.unread = dto.unread && dto.userId !== currentUser?._id
    this.created_at_date = new Date(dto.created_at)
    this.createdAtFormatted = this.formatDate(this.created_at_date)

    makeObservable(this, {
      messages: observable,
      replies: computed,
      unread: observable,
    })
  }

  get replies() {
    return this.messages.slice().sort(sortMessages)
  }

  formatDate(date: Date) {
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]

    return `${monthNames[date.getMonth()]} ${date.getDate()} ${date
      .getHours()
      .toString()
      .padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }
}

const socket = socketIO('http://localhost:8000', {
  withCredentials: true,
  autoConnect: false,
})

class WaveStore {
  waves: Wave[] = []
  users: User[] = []
  messages: Message[] = []
  currentUser?: User = undefined
  currentWave?: Wave = undefined
  queueReads = false
  readQueue: Message[] = []
  ready = false

  constructor() {
    makeObservable(this, {
      waves: observable,
      users: observable,
      messages: observable,
      currentUser: observable,
      ready: observable,
    })

    socket.on('init', (data) => {
      console.log('init', data)
      this.onInit(data.waves, data.users, data.me)
    })

    socket.on('message', (data) => {
      console.log('message', data)
      if (data.messages) {
        data.messages.forEach((message: MessageDTO) => this.onMessage(message))
      } else {
        this.onMessage(data)
      }
    })

    socket.on('ready', () => {
      this.queueReads = this.messages.filter((msg) => msg.unread).length > 1
      // app.showLastWave();
      this.ready = true
    })

    socket.on('updateUser', (data) => {
      console.log('updateUser', data)
      this.onUpdateUser(data)
    })

    socket.on('updateWave', (data) => {
      console.log('updateWave', data)
      this.onUpdateWave(data)
    })

    socket.on('disconnect', () => {
      console.log('disconnect')
      setTimeout(() => socket.connect(), 100)
    })

    socket.on('connect', () => {
      console.log('connect')
    })

    socket.connect()
  }

  onInit(waves: WaveDTO[], users: UserDTO[], me: UserDTO) {
    if (!this.currentUser) {
      runInAction(() => {
        this.currentUser = new User(me)
        this.users = [this.currentUser]
      })
    }

    users.forEach((user) => this.onUpdateUser({ user }))
    waves.forEach((wave) => this.onUpdateWave({ wave }))

    // TODO: loadLocalAttributes, define separate interface for user with those fields
  }

  onMessage(data: MessageDTO) {
    if (this.messages.find((msg) => msg._id === data._id)) {
      return false
    }

    runInAction(() => {
      const message = new Message(data, this.users, this.currentUser)

      const wave = this.waves.find((wave) => wave._id === message.waveId)
      if (wave) {
        if (message.parentId) {
          const parentMessage = wave.messages.find(
            (msg) => msg._id === message.parentId
          )
          if (parentMessage) {
            parentMessage.messages.push(message)
          } else {
            wave.getMessages(message.parentId, wave.rootMessages[0]._id)
            return false
          }
        }

        wave.messages.push(message)
        this.messages.push(message)
      }
    })
  }

  onUpdateWave({ wave }: { wave: WaveDTO }) {
    runInAction(() => {
      const existingWave = this.waves.find((w) => w._id === wave._id)

      if (existingWave) {
        existingWave.update(wave)
      } else {
        const newWave = new Wave(wave, this)
        this.waves.push(newWave)
        /* TODO
      if (1 === app.model.waves.length || this.createTitle === wave.get('title')) {
        app.navigate('wave/' + wave.id, {trigger: true});
      }
      */
      }
    })
  }

  onUpdateUser({ user }: { user: UserDTO }) {
    runInAction(() => {
      const existingUser = this.users.find((u) => u._id === user._id)
      if (existingUser) {
        existingUser.update(user)
      } else {
        this.users.push(new User(user))
      }
    })
  }

  readMessage(message: Message) {
    if (this.queueReads) {
      this.readQueue.push(message)
      this.queueReads = false //queue of max 1
    } else {
      this.readQueue.forEach((msg: Message) => {
        socket.emit('readMessage', { id: msg._id, waveId: msg.waveId })
      }, this)
      this.readQueue = []

      socket.emit('readMessage', { id: message._id, waveId: message.waveId })
    }
  }
}

function sortMessages(msg1: Message, msg2: Message) {
  return msg1.created_at < msg2.created_at ? -1 : 1
}

export default WaveStore
