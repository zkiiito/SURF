import { computed, makeObservable, observable } from 'mobx'
import { User } from './User'
import { MessageDTO } from './WaveStore'

export class Message {
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

export function sortMessages(msg1: Message, msg2: Message) {
  return msg1.created_at < msg2.created_at ? -1 : 1
}
