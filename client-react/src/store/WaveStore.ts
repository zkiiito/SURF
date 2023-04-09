import { makeObservable, observable, runInAction } from 'mobx'
import socketIO from 'socket.io-client'
import { Wave } from './Wave'
import { User } from './User'
import { Message } from './Message'

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

export interface MessageDTO {
  _id: string
  userId: string
  waveId: string
  parentId: string
  message: string
  unread: boolean
  created_at: string
}

class WaveStore {
  waves: Wave[] = []
  users: User[] = []
  messages: Message[] = []
  currentUser?: User = undefined
  currentWave?: Wave = undefined
  queueReads = false
  readQueue: Message[] = []
  ready = false
  socket

  constructor() {
    makeObservable(this, {
      waves: observable,
      users: observable,
      messages: observable,
      currentUser: observable,
      ready: observable,
    })

    this.socket = socketIO('http://localhost:8000', {
      withCredentials: true,
      autoConnect: false,
    })

    this.socket.on('init', (data) => {
      console.log('init', data)
      this.onInit(data.waves, data.users, data.me)
    })

    this.socket.on('message', (data) => {
      console.log('message', data)
      if (data.messages) {
        data.messages.forEach((message: MessageDTO) => this.onMessage(message))
      } else {
        this.onMessage(data)
      }
    })

    this.socket.on('ready', () => {
      this.queueReads = this.messages.filter((msg) => msg.unread).length > 1
      // app.showLastWave();
      this.ready = true
    })

    this.socket.on('updateUser', (data) => {
      console.log('updateUser', data)
      this.onUpdateUser(data)
    })

    this.socket.on('updateWave', (data) => {
      console.log('updateWave', data)
      this.onUpdateWave(data)
    })

    this.socket.on('disconnect', () => {
      console.log('disconnect')
      setTimeout(() => this.socket.connect(), 100)
    })

    this.socket.on('connect', () => {
      console.log('connect')
    })

    this.socket.connect()
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
        this.socket.emit('readMessage', { id: msg._id, waveId: msg.waveId })
      }, this)
      this.readQueue = []

      this.socket.emit('readMessage', {
        id: message._id,
        waveId: message.waveId,
      })
    }
  }
}

export default WaveStore
