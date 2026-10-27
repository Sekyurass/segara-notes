import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'segara-notes-api' })
})

app.get('/api/workspace', async (_req, res) => {
  try {
    const row = await prisma.workspaceSnapshot.findUnique({ where: { id: 'default' } })
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

    const data = JSON.stringify(payload)
    const row = await prisma.workspaceSnapshot.upsert({
      where: { id: 'default' },
      create: { id: 'default', data },
      update: { data },
    })

    res.json({ ok: true, updatedAt: row.updatedAt })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'failed_to_save' })
  }
})

app.listen(port, () => {
  console.log(`Segara Notes API → http://localhost:${port}`)
  console.log(`SQLite → ${dbPath}`)
})
