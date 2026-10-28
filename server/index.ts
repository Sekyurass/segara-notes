import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import crypto from 'node:crypto'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocketServer, type WebSocket } from 'ws'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '../src/generated/prisma/client.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const rawUrl = process.env.DATABASE_URL ?? 'file:./dev.db'
const relative = rawUrl.replace(/^file:/, '').replace(/^\.\//, '')
const dbPath = path.isAbsolute(relative) ? relative : path.join(root, relative)

const adapter = new PrismaBetterSqlite3({ url: dbPath })
const prisma = new PrismaClient({ adapter })
const app = express()
const port = Number(process.env.PORT ?? 8787)

app.use(cors())
app.use(express.json({ limit: '2mb' }))

type Peer = {
  ws: WebSocket
  clientId: string
  name: string
  pageId: string | null
  color: string
  workspaceId: string
}
const peers = new Set<Peer>()

function workspaceIdOf(req: express.Request): string {
  const id = String(req.headers['x-workspace-id'] ?? 'default').trim()
  return id || 'default'
}

function peerList(workspaceId?: string) {
  const list = [...peers]
    .filter((p) => !workspaceId || p.workspaceId === workspaceId)
    .map((p) => ({
      clientId: p.clientId,
      name: p.name,
      pageId: p.pageId,
      color: p.color,
    }))
  return { type: 'presence' as const, peers: list.length, list }
}

function broadcast(payload: object, exceptClientId?: string, workspaceId?: string) {
  const data = JSON.stringify(payload)
  for (const peer of peers) {
    if (exceptClientId && peer.clientId === exceptClientId) continue
    if (workspaceId && peer.workspaceId !== workspaceId) continue
    if (peer.ws.readyState === 1) peer.ws.send(data)
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'segara-notes-api', peers: peers.size })
})

app.get('/api/workspace/meta', async (req, res) => {
  try {
    const id = workspaceIdOf(req)
    const row = await prisma.workspaceSnapshot.findUnique({ where: { id } })
    if (!row) {
      res.status(404).json({ error: 'empty' })
      return
    }
    res.json({ updatedAt: row.updatedAt })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'failed_to_load' })
  }
})

app.get('/api/workspace', async (req, res) => {
  try {
    const id = workspaceIdOf(req)
    const row = await prisma.workspaceSnapshot.findUnique({ where: { id } })
    if (!row) {
      res.status(404).json({ error: 'empty' })
      return
    }
    res.json(JSON.parse(row.data))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'failed_to_load' })
  }
})

app.put('/api/workspace', async (req, res) => {
  try {
    const payload = req.body
    if (!payload || typeof payload !== 'object' || !Array.isArray(payload.pages)) {
      res.status(400).json({ error: 'invalid_workspace' })
      return
    }

    const id = workspaceIdOf(req)
    const data = JSON.stringify(payload)
    const row = await prisma.workspaceSnapshot.upsert({
      where: { id },
      create: { id, data },
      update: { data },
    })

    const clientId = String(req.headers['x-client-id'] ?? '')
    broadcast(
      {
        type: 'workspace-updated',
        updatedAt: row.updatedAt.toISOString(),
        clientId: clientId || undefined,
      },
      clientId || undefined,
      id,
    )

    res.json({ ok: true, updatedAt: row.updatedAt })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'failed_to_save' })
  }
})

app.post('/api/share', async (req, res) => {
  try {
    const pageId = String(req.body?.pageId ?? '')
    const canEdit = Boolean(req.body?.canEdit)
    const workspaceId = workspaceIdOf(req)
    if (!pageId) {
      res.status(400).json({ error: 'pageId_required' })
      return
    }

    const row = await prisma.workspaceSnapshot.findUnique({ where: { id: workspaceId } })
    if (!row) {
      res.status(404).json({ error: 'workspace_empty' })
      return
    }

    const workspace = JSON.parse(row.data) as { pages?: Array<{ id: string }> }
    const page = workspace.pages?.find((p) => p.id === pageId)
    if (!page) {
      res.status(404).json({ error: 'page_not_found' })
      return
    }

    const token = crypto.randomBytes(12).toString('hex')
    await prisma.shareLink.create({
      data: { token, pageId, workspaceId, canEdit },
    })
    res.json({ token, canEdit })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'failed_to_share' })
  }
})

app.get('/api/share/:token', async (req, res) => {
  try {
    const link = await prisma.shareLink.findUnique({ where: { token: req.params.token } })
    if (!link) {
      res.status(404).json({ error: 'invalid_token' })
      return
    }

    const row = await prisma.workspaceSnapshot.findUnique({ where: { id: link.workspaceId } })
    if (!row) {
      res.status(404).json({ error: 'workspace_empty' })
      return
    }

    const workspace = JSON.parse(row.data) as {
      pages?: Array<Record<string, unknown> & { id: string; deletedAt?: number | null }>
    }
    const page = workspace.pages?.find((p) => p.id === link.pageId && !p.deletedAt)
    if (!page) {
      res.status(404).json({ error: 'page_missing' })
      return
    }

    res.json({ page, canEdit: link.canEdit })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'failed_to_load_share' })
  }
})

app.put('/api/share/:token', async (req, res) => {
  try {
    const link = await prisma.shareLink.findUnique({ where: { token: req.params.token } })
    if (!link || !link.canEdit) {
      res.status(403).json({ error: 'forbidden' })
      return
    }
    const nextPage = req.body?.page
    if (!nextPage || typeof nextPage !== 'object' || nextPage.id !== link.pageId) {
      res.status(400).json({ error: 'invalid_page' })
      return
    }

    const row = await prisma.workspaceSnapshot.findUnique({ where: { id: link.workspaceId } })
    if (!row) {
      res.status(404).json({ error: 'workspace_empty' })
      return
    }

    const workspace = JSON.parse(row.data) as {
      pages: Array<Record<string, unknown> & { id: string }>
      revision?: number
    }
    const idx = workspace.pages.findIndex((p) => p.id === link.pageId)
    if (idx < 0) {
      res.status(404).json({ error: 'page_missing' })
      return
    }
    workspace.pages[idx] = {
      ...nextPage,
      id: link.pageId,
      updatedAt: Date.now(),
    }
    workspace.revision = (workspace.revision ?? 0) + 1

    const updated = await prisma.workspaceSnapshot.update({
      where: { id: link.workspaceId },
      data: { data: JSON.stringify(workspace) },
    })

    const clientId = String(req.headers['x-client-id'] ?? '')
    broadcast(
      {
        type: 'workspace-updated',
        updatedAt: updated.updatedAt.toISOString(),
        clientId: clientId || undefined,
      },
      clientId || undefined,
      link.workspaceId,
    )

    res.json({ ok: true, page: workspace.pages[idx] })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'failed_to_save_share' })
  }
})

const server = http.createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

wss.on('connection', (ws) => {
  const peer: Peer = {
    ws,
    clientId: crypto.randomUUID(),
    name: 'Tamu',
    pageId: null,
    color: '#0F766E',
    workspaceId: 'default',
  }
  peers.add(peer)

  ws.send(JSON.stringify({ type: 'welcome', clientId: peer.clientId, ...peerList(peer.workspaceId) }))
  broadcast(peerList(peer.workspaceId), peer.clientId, peer.workspaceId)

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(String(raw)) as {
        type?: string
        clientId?: string
        name?: string
        pageId?: string | null
        color?: string
        workspaceId?: string
      }
      if (msg.type === 'hello' && typeof msg.clientId === 'string' && msg.clientId) {
        peer.clientId = msg.clientId
        if (typeof msg.workspaceId === 'string' && msg.workspaceId) {
          peer.workspaceId = msg.workspaceId
        }
        return
      }
      if (msg.type === 'presence') {
        if (typeof msg.name === 'string') peer.name = msg.name.slice(0, 40) || 'Tamu'
        peer.pageId = typeof msg.pageId === 'string' ? msg.pageId : null
        if (typeof msg.color === 'string') peer.color = msg.color
        if (typeof msg.workspaceId === 'string' && msg.workspaceId) {
          peer.workspaceId = msg.workspaceId
        }
        broadcast(peerList(peer.workspaceId), undefined, peer.workspaceId)
        return
      }
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }))
      }
    } catch {
      /* ignore */
    }
  })

  ws.on('close', () => {
    peers.delete(peer)
    broadcast(peerList(peer.workspaceId), undefined, peer.workspaceId)
  })
})

server.listen(port, () => {
  console.log(`Segara Notes API → http://localhost:${port}`)
  console.log(`WebSocket → ws://localhost:${port}/ws`)
  console.log(`SQLite → ${dbPath}`)
})
