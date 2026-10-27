# Segara Notes

Catatan bergaya Notion: **sidebar bersarang**, **block editor**, **slash menu**, dan **drag & drop**.  
Data di **localStorage**, dengan sync opsional ke **API Prisma + SQLite**.

## Fitur

- Halaman root + **sub-halaman** (nested) + breadcrumb
- Blok: paragraf, H1, H2, bullet, to-do, code
- Ketik `/` untuk ganti jenis blok
- Enter = blok baru · Backspace di baris kosong = hapus blok
- Seret handle `⋮⋮` untuk mengurutkan blok
- Tema terang / gelap
- **Export Markdown** (`.md`)
- Sync workspace ke API (fallback lokal jika API mati)
- UI guide: [UI-GUIDE.md](./UI-GUIDE.md)

## Stack

- React 19 + TypeScript + Vite
- Express + Prisma 7 + SQLite (`better-sqlite3`)
- CSS variables (tanpa UI library)

## Jalankan

```bash
npm install
```

Terminal 1 — API (port 8787):

```bash
npm run dev:api
```

Terminal 2 — frontend:

```bash
npm run dev
```

Tanpa API, aplikasi tetap jalan lewat localStorage (status **Lokal saja**).

Database:

```bash
npm run db:migrate
npm run db:generate
```

Salin `.env.example` → `.env` bila perlu.

Build produksi frontend:

```bash
npm run build
npm run preview
```

## API

| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/api/health` | health check |
| GET | `/api/workspace` | ambil snapshot JSON |
| PUT | `/api/workspace` | simpan snapshot JSON |

## Struktur

```
server/         Express + Prisma
prisma/         schema + migrations
src/
  components/   Sidebar, Editor, BlockRow, SlashMenu
  lib/          storage, api, markdown, blocks, pages, id
  styles/       tokens + app
  types.ts
UI-GUIDE.md
```

## Roadmap berikutnya

1. Auth
2. Deploy (Vercel + DB hosted)
3. Inline formatting (bold/italic)
