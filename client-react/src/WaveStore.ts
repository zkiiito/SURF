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

export interface WaveDTO {
  _id: string
  title: string
  userIds: []
}

export interface Wave extends WaveDTO {}

const socket = socketIO('http://localhost:8000', {
  withCredentials: true,
  autoConnect: false,
})

class WaveStore {
  waves: Wave[] = []
  users: User[] = []
  messages = []
  currentUser: User | undefined = undefined
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
      this.login(data.waves, data.users, data.me)
      // setUsers([...data.users, data.me])
    })

    socket.connect()
  }

  login(waves: WaveDTO[], users: UserDTO[], me: UserDTO) {
    runInAction(() => {
      this.waves = waves
      this.users = [...users, me]
      this.currentUser = me
    })
  }
}

export default WaveStore
