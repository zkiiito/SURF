import express from 'express'
import { createServer } from 'node:http'
import path from 'node:path'
import { Server } from 'socket.io'

// Exercise the production React build with controlled Socket.IO events. Real
// authentication, persistence and uploads remain covered by the full-stack specs.
export function registerReactFixtureServer(on) {
  let server
  let io
  let url
  let scenario
  let events = []
  let counter = 1000

  on('task', {
    async 'react:reset'(data) {
      if (!server) {
        const app = express()
        app.use(express.static(path.resolve('client-react/dist')))
        server = createServer(app)
        io = new Server(server)
        io.on('connection', socket => {
          socket.onAny((event, data) => events.push({ event, data }))
          socket.on('message', data => {
            const message = { ...data, _id: (++counter).toString(16).padStart(24, '0'), created_at: Date.now(), unread: false }
            scenario.messages.push(message)
            io.emit('message', message)
          })
          socket.on('createWave', data => {
            const wave = { ...data, _id: (++counter).toString(16).padStart(24, '0'), userIds: [...new Set([scenario.me._id, ...data.userIds])] }
            scenario.waves.push(wave)
            io.emit('updateWave', { wave })
          })
          socket.on('getUser', ({ userId }) => {
            const user = [...scenario.users, ...(scenario.hiddenUsers ?? [])].find(user => user._id === userId)
            if (user) socket.emit('updateUser', { user })
          })
          socket.on('updateUser', data => {
            scenario.me = { ...scenario.me, ...data }
            io.emit('updateUser', { user: scenario.me })
          })
          socket.on('getLinkPreview', ({ msgId, url }) => {
            socket.emit('linkPreviewReady', { msgId, data: { url, title: url, description: 'Preview', image: '' } })
          })
          socket.emit('init', { me: scenario.me, users: scenario.users, waves: scenario.waves })
          socket.emit('message', { messages: scenario.messages })
          if (scenario.ready !== false) socket.emit('ready')
        })
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
        url = `http://127.0.0.1:${server.address().port}`
      }
      io.disconnectSockets(true)
      scenario = structuredClone(data)
      events = []
      return url
    },
    'react:emit'({ event, data }) {
      io.emit(event, data)
      return null
    },
    'react:disconnect'() {
      io.disconnectSockets(true)
      return null
    },
    'react:events'() { return events },
  })
  on('after:run', async () => {
    if (io) await new Promise(resolve => io.close(resolve))
  })
}
