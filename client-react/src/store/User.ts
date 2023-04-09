import { makeObservable, observable } from 'mobx'
import { UserDTO } from './WaveStore'

export class User {
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
