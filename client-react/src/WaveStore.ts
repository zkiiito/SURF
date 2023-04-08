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
  users: User[]
  currentMessage?: Message

  constructor(dto: WaveDTO, users: User[]) {
    this._id = dto._id
    this.title = dto.title
    this.userIds = dto.userIds
    this.messages = []
    this.users = this.userIds
      .map((userId) => users.find((u) => u._id === userId)!)
      .filter(Boolean)

    makeObservable(this, {
      title: observable,
      userIds: observable,
      messages: observable,
      rootMessages: computed,
    })
  }

  get rootMessages() {
    return this.messages.filter((m) => !m.parentId).sort(sortMessages)
  }

  update(dto: WaveDTO, users: User[]) {
    this.title = dto.title
    this.userIds = dto.userIds
    this.users = this.userIds
      .map((userId) => users.find((u) => u._id === userId)!)
      .filter(Boolean)
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
  created_at_date?: Date

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

    makeObservable(this, {
      replies: computed,
      unread: observable,
    })
  }

  get replies() {
    return this.messages.sort(sortMessages)
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

    socket.connect()
  }

  onInit(waves: WaveDTO[], users: UserDTO[], me: UserDTO) {
    runInAction(() => {
      this.currentUser = new User(me)
      this.users = [
        ...users.map((userDTO) => new User(userDTO)),
        this.currentUser,
      ]

      waves.forEach((waveDTO) => {
        const wave = new Wave(waveDTO, this.users)
        this.waves.push(wave)
      })

      // TODO: loadLocalAttributes, define separate interface for user with those fields
    })
  }

  onMessage(data: MessageDTO) {
    runInAction(() => {
      const message = new Message(data, this.users, this.currentUser)

      this.messages.push(message)
      const wave = this.waves.find((wave) => wave._id === message.waveId)
      if (wave) {
        wave.messages.push(message)
        if (message.parentId) {
          const parentMessage = this.messages.find(
            (msg) => msg._id === message.parentId
          )
          if (parentMessage) {
            parentMessage.messages.push(message)
          }
        }
      }
    })
  }

  onUpdateWave({ wave }: { wave: WaveDTO }) {
    runInAction(() => {
      const existingWave = this.waves.find((w) => w._id === wave._id)

      if (existingWave) {
        existingWave.update(wave, this.users)
      } else {
        const newWave = new Wave(wave, this.users)
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

  sendMessage(message: string, waveId: string, parentId?: string) {
    var msg = {
      userId: this.currentUser?._id,
      waveId: waveId,
      message: message,
      parentId: parentId,
    }
    socket.emit('message', msg)
  }

  readMessage(message: Message) {
    runInAction(() => {
      message.unread = false
    })
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
