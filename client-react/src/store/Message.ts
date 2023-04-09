import { computed, makeObservable, observable, runInAction } from 'mobx'
import * as linkify from 'linkifyjs'
import { User } from './User'
import WaveStore, { MessageDTO } from './WaveStore'

export type LinkPreviewDTO = {
  description?: string
  image?: string
  title?: string
  url: string
}

export class Message {
  _id: string
  userId: string
  waveId: string
  parentId: string
  message: string
  unread: boolean
  created_at: string

  messages: Message[]
  linkPreviews: LinkPreviewDTO[]
  user?: User
  created_at_date: Date
  createdAtFormatted: string

  private store: WaveStore

  constructor(dto: MessageDTO, store: WaveStore) {
    this._id = dto._id
    this.userId = dto.userId
    this.waveId = dto.waveId
    this.parentId = dto.parentId
    this.message = dto.message
    this.created_at = dto.created_at
    this.messages = []
    this.user = store.users.find((u) => u._id === dto.userId)
    this.unread = dto.unread && dto.userId !== store.currentUser?._id
    this.created_at_date = new Date(dto.created_at)
    this.createdAtFormatted = this.formatDate(this.created_at_date)
    this.linkPreviews = []

    this.store = store

    makeObservable(this, {
      messages: observable,
      replies: computed,
      unread: observable,
      linkPreviews: observable,
    })

    this.parseLinks()
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

  parseLinks() {
    const links = linkify.find(this.message)
    const urlVideoRegex =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]+).*/gim

    links
      .filter((link) => link.type === 'url')
      .forEach((link) => {
        if (
          link.href.endsWith('.gif') ||
          link.href.endsWith('.jpg') ||
          link.href.endsWith('.png')
        ) {
          this.linkPreviews.push({ image: link.href, url: link.href })
        } else if (link.href.match(urlVideoRegex)) {
          const parts = urlVideoRegex.exec(link.href)
          this.linkPreviews.push({ image: parts?.[2], url: 'youtube' })
        } else {
          this.fetchLinkPreview(link.href)
        }
      })
  }

  fetchLinkPreview(url: string) {
    this.store.socket.emit('getLinkPreview', {
      msgId: this._id,
      url,
    })
  }

  addLinkPreview(linkPreview: LinkPreviewDTO) {
    runInAction(() => {
      this.linkPreviews.push(linkPreview)
    })
  }
}

export function sortMessages(msg1: Message, msg2: Message) {
  return msg1.created_at < msg2.created_at ? -1 : 1
}
