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

export interface User extends UserDTO {}

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

    // makeAutoObservable(this)

    makeObservable(this, {
      title: observable,
      userIds: observable,
      messages: observable,
      rootMessages: computed,
    })
  }

  get rootMessages() {
    return this.messages.filter((m) => !m.parentId)
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

export interface Message extends MessageDTO {
  messages: Message[]
  user?: User
  created_at_date: Date
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

    socket.connect()
  }

  onInit(waves: WaveDTO[], users: UserDTO[], me: UserDTO) {
    runInAction(() => {
      this.users = [...users, me]
      this.currentUser = me

      waves.forEach((waveDTO) => {
        const wave = new Wave(waveDTO, this.users)
        this.waves.push(wave)
      })

      // TODO: loadLocalAttributes, define separate interface for user with those fields
    })
  }

  onMessage(data: MessageDTO) {
    runInAction(() => {
      const message: Message = {
        ...data,
        messages: [],
        user: this.users.find((u) => u._id === data.userId),
        created_at_date: new Date(),
      }

      makeObservable(message, {
        messages: observable,
      })

      this.messages.push(message)
      const wave = this.waves.find((wave) => wave._id === message.waveId)
      if (wave) {
        wave.messages.push(message)
        wave.messages.sort(sortMessages)
        if (message.parentId) {
          const parentMessage = this.messages.find(
            (msg) => msg._id === message.parentId
          )
          if (parentMessage) {
            parentMessage.messages.push(message)
            parentMessage.messages.sort(sortMessages)
          }
        }
      }
    })
  }
}

function sortMessages(msg1: Message, msg2: Message) {
  return msg1.created_at < msg2.created_at ? -1 : 1
}

export default WaveStore
