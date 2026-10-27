# Segara Notes

Catatan bergaya Notion: block editor, halaman bersarang, slash menu, favorit, trash, dan sync API opsional.

## Fitur

- Halaman nested + breadcrumb + drag reorder sidebar
- Favorit, soft-delete (Trash), restore / hapus permanen
- Cover gradient + icon emoji per halaman
- Blok: teks, H1–H3, bullet, numbered, to-do, code, quote, callout, toggle, divider, image
- Slash menu berkelompok + navigasi keyboard
- Inline format (bold / italic / code / link) lewat toolbar seleksi
- Indent list (`Tab` / `Shift+Tab`)
- Mention halaman dengan `@`
- Cari cepat `Ctrl+K` / `Cmd+K`
- Drag & drop urutan blok + menu `⋯` (duplikat / hapus / indent)
- Tema terang / gelap, export Markdown, sync Prisma/SQLite
- UI guide: [UI-GUIDE.md](./UI-GUIDE.md)

## Stack

- React 19 + TypeScript + Vite
- Express + Prisma 7 + SQLite
- CSS variables

## Jalankan

```bash
npm install
npm run dev:api   # terminal 1
npm run dev       # terminal 2
```

Tanpa API, data tetap di localStorage.

## Roadmap berikutnya

1. Auth + share link
2. Database / board view
3. Realtime kolaborasi
