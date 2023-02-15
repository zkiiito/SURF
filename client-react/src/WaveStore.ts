import { makeObservable, observable } from 'mobx'

export type UserType = {
  name: string
  avatar: string
  status: string
  facebookId: string
  facebookAvatar: string
  googleId: string
  googleAvatar: string
  _id: string
}

class WaveStore {
  waves = []
  users: UserType[] = []
  messages = []
  currentUser: UserType | undefined = undefined
  ready = false

  constructor() {
    makeObservable(this, {
      waves: observable,
      users: observable,
      messages: observable,
      currentUser: observable,
      ready: observable,
    })
  }
}

export default WaveStore
