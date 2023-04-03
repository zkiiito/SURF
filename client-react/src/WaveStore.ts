import { makeObservable, observable, runInAction } from 'mobx'
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

export interface Wave extends WaveDTO {
  messages: Message[]
  users: User[]
  currentMessage?: Message
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
  messages?: Message[]
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
      this.onMessage(data)
    })

    socket.connect()
  }

  onInit(waves: WaveDTO[], users: UserDTO[], me: UserDTO) {
    runInAction(() => {
      this.users = [...users, me]
      this.currentUser = me

      this.waves = waves.map((waveDTO) => {
        return {
          ...waveDTO,
          messages: [],
          users: waveDTO.userIds
            .map((userId) => this.users.find((u) => u._id === userId)!)
            .filter(Boolean),
        }
      })

      // TODO: loadLocalAttributes, define separate interface for user with those fields
    })
  }

  onMessage(data: { messages: MessageDTO[] }) {
    runInAction(() => {
      data.messages.forEach((messageDTO) => {
        const message: Message = {
          ...messageDTO,
          messages: [],
          user: this.users.find((u) => u._id === messageDTO.userId),
          created_at_date: new Date(),
        }
        const wave = this.waves.find((wave) => wave._id === message.waveId)
        if (wave) {
          wave.messages.push(message)
        }
      })
    })
  }
}

export default WaveStore
