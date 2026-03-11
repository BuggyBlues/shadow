/**
 * Shadow SDK — End-to-End Tests
 *
 * Tests the complete SDK (ShadowClient + ShadowSocket) against a real
 * PostgreSQL database and HTTP+WebSocket server:
 *
 *   1. REST API — auth, messages, reactions, threads, channels, servers
 *   2. Socket.IO — real-time events, room joins, typing, presence
 *   3. Integration — send via REST, receive via Socket; send via Socket, verify via REST
 *
 * Requires: docker compose postgres running on localhost:5432
 */

import { createServer } from 'node:http'
import { CLIENT_EVENTS, SERVER_EVENTS, ShadowClient, ShadowSocket } from '@shadowob/sdk'
import { asValue } from 'awilix'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { Server as SocketIOServer } from 'socket.io'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import { type AppContainer, createAppContainer } from '../src/container'
import type { Database } from '../src/db'
import * as schema from '../src/db/schema'
import { signAccessToken } from '../src/lib/jwt'
import { setupWebSocket } from '../src/ws'

/* ═══════════════════════════════════════════════════════
   Setup — real Postgres + HTTP server + Socket.IO
   ═══════════════════════════════════════════════════════ */

const TEST_DB_URL = process.env.DATABASE_URL ?? 'postgresql://shadow:shadow@localhost:5432/shadow'

let sql: ReturnType<typeof postgres>
let db: Database
let container: AppContainer
let httpServer: ReturnType<typeof createServer>
let io: SocketIOServer
let baseUrl: string

// Test identities
let userId: string
let userToken: string
let user2Id: string
let user2Token: string
let serverId: string
let channelId: string

// SDK instances
let client: ShadowClient
let client2: ShadowClient
let socket: ShadowSocket
let socket2: ShadowSocket

beforeAll(async () => {
  // Database
  sql = postgres(TEST_DB_URL, { max: 5 })
  db = drizzle(sql, { schema })
  container = createAppContainer(db)

  // Hono app
  const app = createApp(container)

  // HTTP server
  httpServer = createServer(async (req, res) => {
    const response = await app.fetch(
      new Request(`http://localhost${req.url}`, {
        method: req.method,
        headers: req.headers as HeadersInit,
        body: ['GET', 'HEAD'].includes(req.method ?? '')
          ? undefined
          : await new Promise<string>((resolve) => {
              const chunks: Buffer[] = []
              req.on('data', (c: Buffer) => chunks.push(c))
              req.on('end', () => resolve(Buffer.concat(chunks).toString()))
            }),
      }),
    )
    res.writeHead(response.status, Object.fromEntries(response.headers.entries()))
    const body = await response.arrayBuffer()
    res.end(Buffer.from(body))
  })

  // Socket.IO
  io = new SocketIOServer(httpServer, {
    cors: { origin: '*' },
    transports: ['websocket'],
  })
  setupWebSocket(io, container)
  container.register({ io: asValue(io) })

  // Start server on random port
  await new Promise<void>((resolve) => {
    httpServer.listen(0, () => resolve())
  })
  const addr = httpServer.address()
  const port = typeof addr === 'object' && addr ? addr.port : 0
  baseUrl = `http://localhost:${port}`

  // Create test users
  const userDao = container.resolve('userDao')
  const ts = Date.now()

  const user1 = await userDao.create({
    email: `sdk-e2e-1-${ts}@test.local`,
    username: `sdke2e1_${ts}`,
    passwordHash: 'not-used',
  })
  userId = user1!.id
  userToken = signAccessToken({
    userId,
    email: user1!.email,
    username: user1!.username,
  })

  const user2 = await userDao.create({
    email: `sdk-e2e-2-${ts}@test.local`,
    username: `sdke2e2_${ts}`,
    passwordHash: 'not-used',
  })
  user2Id = user2!.id
  user2Token = signAccessToken({
    userId: user2Id,
    email: user2!.email,
    username: user2!.username,
  })

  // Create a server and channel
  const channelService = container.resolve('channelService')

  const serverDao = container.resolve('serverDao')
  const server = await serverDao.create({ name: `sdke2e-${ts}`, ownerId: userId })
  serverId = server!.id

  // Join both users
  await serverDao.addMember(serverId, userId, 'owner')
  await serverDao.addMember(serverId, user2Id, 'member')

  // Create a text channel
  const ch = await channelService.create(serverId, {
    name: 'sdk-test-channel',
    type: 'text',
  })
  channelId = ch.id

  // Initialize SDK clients
  client = new ShadowClient(baseUrl, userToken)
  client2 = new ShadowClient(baseUrl, user2Token)

  // Initialize SDK sockets
  socket = new ShadowSocket({ serverUrl: baseUrl, token: userToken })
  socket2 = new ShadowSocket({ serverUrl: baseUrl, token: user2Token })
  socket.connect()
  socket2.connect()
  await Promise.all([socket.waitForConnect(), socket2.waitForConnect()])
}, 30_000)

afterAll(async () => {
  socket?.disconnect()
  socket2?.disconnect()
  // Give handlers time to process disconnect events before closing IO/DB
  await new Promise((r) => setTimeout(r, 200))
  io?.close()
  httpServer?.close()
  await new Promise((r) => setTimeout(r, 100))
  await sql?.end()
}, 10_000)

/* ═══════════════════════════════════════════════════════
   Tests
   ═══════════════════════════════════════════════════════ */

describe('SDK Constants', () => {
  it('exports CLIENT_EVENTS and SERVER_EVENTS', () => {
    expect(CLIENT_EVENTS.CHANNEL_JOIN).toBe('channel:join')
    expect(CLIENT_EVENTS.MESSAGE_SEND).toBe('message:send')
    expect(SERVER_EVENTS.MESSAGE_NEW).toBe('message:new')
    expect(SERVER_EVENTS.REACTION_ADD).toBe('reaction:add')
    expect(SERVER_EVENTS.NOTIFICATION_NEW).toBe('notification:new')
  })
})

describe('ShadowClient REST API', () => {
  let messageId: string

  it('getMe() returns current user', async () => {
    const me = await client.getMe()
    expect(me.id).toBe(userId)
    expect(me.username).toContain('sdke2e1')
  })

  it('getServer() returns server info', async () => {
    const server = await client.getServer(serverId)
    expect(server.id).toBe(serverId)
    expect(server.name).toContain('sdke2e')
  })

  it('getServerChannels() lists channels', async () => {
    const channels = await client.getServerChannels(serverId)
    expect(channels.length).toBeGreaterThanOrEqual(1)
    expect(channels.some((c: { id: string }) => c.id === channelId)).toBe(true)
  })

  it('sendMessage() creates a message', async () => {
    const msg = await client.sendMessage(channelId, 'Hello from SDK test!')
    expect(msg.id).toBeDefined()
    expect(msg.content).toBe('Hello from SDK test!')
    expect(msg.channelId).toBe(channelId)
    messageId = msg.id
  })

  it('getMessages() returns messages', async () => {
    const result = await client.getMessages(channelId)
    expect(result.messages.length).toBeGreaterThanOrEqual(1)
    expect(result.messages.some((m: { id: string }) => m.id === messageId)).toBe(true)
  })

  it('editMessage() updates content', async () => {
    const updated = await client.editMessage(messageId, 'Updated content')
    expect(updated.content).toBe('Updated content')
  })

  it('addReaction() and removeReaction()', async () => {
    await client.addReaction(messageId, '👍')
    const result = await client.getMessages(channelId)
    const msg = result.messages.find((m: { id: string }) => m.id === messageId)
    expect(msg).toBeDefined()

    await client.removeReaction(messageId, '👍')
  })

  it('createThread() and thread messages', async () => {
    const thread = await client.createThread(channelId, 'Test Thread', messageId)
    expect(thread.id).toBeDefined()
    expect(thread.name).toBe('Test Thread')

    const threadMsg = await client.sendToThread(thread.id, 'Thread reply')
    expect(threadMsg.content).toBe('Thread reply')

    const threadMsgs = await client.getThreadMessages(thread.id)
    expect(threadMsgs.length).toBeGreaterThanOrEqual(1)
  })

  it('updateServer() updates server info', async () => {
    const updated = await client.updateServer(serverId, {
      description: 'SDK test server',
    })
    expect(updated.id).toBe(serverId)
  })

  it('deleteMessage() removes a message', async () => {
    const tempMsg = await client.sendMessage(channelId, 'To be deleted')
    await client.deleteMessage(tempMsg.id)
    const result = await client.getMessages(channelId)
    expect(result.messages.find((m: { id: string }) => m.id === tempMsg.id)).toBeUndefined()
  })

  it('sendHeartbeat() succeeds for agent', async () => {
    const agentService = container.resolve('agentService')
    const agent = await agentService.create({
      name: 'SDK Test Bot',
      username: 'sdktestbot',
      kernelType: 'openclaw',
      config: {},
      ownerId: userId,
    })

    const tokenResult = await agentService.generateToken(agent.id, userId)
    const botClient = new ShadowClient(baseUrl, tokenResult.token)

    const result = await botClient.sendHeartbeat(agent.id)
    expect(result.ok).toBe(true)
  })
})

describe('ShadowSocket real-time events', () => {
  it('connects successfully', () => {
    expect(socket.connected).toBe(true)
    expect(socket2.connected).toBe(true)
  })

  it('joinChannel() returns ok', async () => {
    const res = await socket.joinChannel(channelId)
    expect(res.ok).toBe(true)

    const res2 = await socket2.joinChannel(channelId)
    expect(res2.ok).toBe(true)
  })

  it('receives message:new when a message is sent via REST', async () => {
    const received = new Promise<{ id: string; content: string }>((resolve) => {
      socket2.once('message:new', (msg) => {
        if (msg.content === 'SDK realtime test') resolve(msg)
      })
    })

    await client.sendMessage(channelId, 'SDK realtime test')

    const msg = await received
    expect(msg.content).toBe('SDK realtime test')
    expect(msg.id).toBeDefined()
  })

  it('receives message:new when sent via sendMessage()', async () => {
    const received = new Promise<{ content: string }>((resolve) => {
      socket.once('message:new', (msg) => {
        if (msg.content === 'WS send test') resolve(msg)
      })
    })

    socket2.sendMessage({ channelId, content: 'WS send test' })

    const msg = await received
    expect(msg.content).toBe('WS send test')
  })

  it('receives typing indicator via raw socket', async () => {
    const received = new Promise<{ channelId: string; userId: string }>((resolve) => {
      socket.raw.once('message:typing', resolve)
    })

    socket2.sendTyping(channelId)

    const payload = await received
    expect(payload.channelId).toBe(channelId)
    expect(payload.userId).toBe(user2Id)
  })

  it('leaveChannel() stops receiving events from that channel', async () => {
    socket2.leaveChannel(channelId)
    await new Promise((r) => setTimeout(r, 100))

    let received = false
    const handler = () => {
      received = true
    }
    socket2.on('message:new', handler)

    await client.sendMessage(channelId, 'After leave test')
    await new Promise((r) => setTimeout(r, 200))
    expect(received).toBe(false)
    socket2.off('message:new', handler)

    // Re-join for subsequent tests
    await socket2.joinChannel(channelId)
  })

  it('removeAllListeners() cleans up', () => {
    const handler = () => {}
    socket.on('message:new', handler)
    socket.on('member:typing', handler)
    socket.removeAllListeners()
  })

  it('on/off correctly manages listeners', async () => {
    let count = 0
    const handler = () => {
      count++
    }
    socket.on('message:new', handler)

    await client2.sendMessage(channelId, 'listener test 1')
    await new Promise((r) => setTimeout(r, 300))
    expect(count).toBe(1)

    socket.off('message:new', handler)

    await client2.sendMessage(channelId, 'listener test 2')
    await new Promise((r) => setTimeout(r, 300))
    expect(count).toBe(1) // Still 1, handler was removed
  })

  it('waitForConnect() resolves immediately when already connected', async () => {
    await socket.waitForConnect()
  })

  it('raw socket is accessible', () => {
    expect(socket.raw).toBeDefined()
    expect(socket.raw.connected).toBe(true)
  })
})

describe('ShadowSocket connection lifecycle', () => {
  it('disconnect() and reconnect work', async () => {
    const tempSocket = new ShadowSocket({ serverUrl: baseUrl, token: userToken })
    tempSocket.connect()
    await tempSocket.waitForConnect()
    expect(tempSocket.connected).toBe(true)

    tempSocket.disconnect()
    expect(tempSocket.connected).toBe(false)

    tempSocket.connect()
    await tempSocket.waitForConnect()
    expect(tempSocket.connected).toBe(true)

    tempSocket.disconnect()
  })

  it('onConnect and onDisconnect callbacks fire', async () => {
    const tempSocket = new ShadowSocket({ serverUrl: baseUrl, token: userToken })

    let connected = false
    let disconnected = false
    tempSocket.onConnect(() => {
      connected = true
    })
    tempSocket.onDisconnect(() => {
      disconnected = true
    })

    tempSocket.connect()
    await tempSocket.waitForConnect()
    expect(connected).toBe(true)

    tempSocket.disconnect()
    await new Promise((r) => setTimeout(r, 100))
    expect(disconnected).toBe(true)
  })

  it('waitForConnect() rejects on timeout', async () => {
    const badSocket = new ShadowSocket({
      serverUrl: 'http://localhost:1',
      token: 'invalid',
      autoReconnect: false,
    })

    await expect(badSocket.waitForConnect(500)).rejects.toThrow('timeout')
    badSocket.disconnect()
  })
})
