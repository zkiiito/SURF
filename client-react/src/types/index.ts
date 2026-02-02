export interface User {
  _id: string
  name: string
  avatar: string
  status: 'online' | 'offline'
  showPictures?: boolean
  showVideos?: boolean
  showLinkPreviews?: boolean
  showMentions?: boolean
}

export interface Wave {
  _id: string
  title: string
  userIds: string[]
  archived: boolean
  current?: boolean
}

export interface Message {
  _id: string
  userId: string
  waveId: string
  message: string
  parentId: string | null
  created_at: number
  unread: boolean
  linkPreview?: LinkPreview
}

export interface LinkPreview {
  url: string
  title: string
  description: string
  image: string
}

export interface SocketInitData {
  me: User
  users: User[]
  waves: Wave[]
}

export interface SocketMessageData {
  _id: string
  userId: string
  waveId: string
  message: string
  parentId: string | null
  created_at: number | string // Can be timestamp or Date string from server
  unread?: boolean
  messages?: SocketMessageData[]
}

export interface SendMessagePayload {
  userId: string
  waveId: string
  message: string
  parentId: string | null
}

export interface CreateWavePayload {
  title: string
  userIds: string[]
}

export interface UpdateWavePayload {
  id: string
  title: string
  userIds: string[]
}

export interface UpdateUserPayload {
  name: string
  avatar: string
}

