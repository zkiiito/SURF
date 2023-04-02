import { makeObservable, observable, runInAction } from 'mobx'

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

export type WaveType = {
  id: string
  title: string
}

class WaveStore {
  waves: WaveType[] = []
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

  login(waves: WaveType[], users: UserType[], me: UserType) {
    runInAction(() => {
      this.waves = waves
      this.users = [...users, me]
      this.currentUser = me
    })
  }
}

export default WaveStore
