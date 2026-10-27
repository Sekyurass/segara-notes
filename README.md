# Segara Notes

Catatan bergaya Notion: **sidebar bersarang**, **block editor**, **slash menu**, dan **drag & drop**.  
Data disimpan di **localStorage** (belum ada backend).

## Fitur

- Halaman root + **sub-halaman** (nested) + breadcrumb
- Blok: paragraf, H1, H2, bullet, to-do, code
- Ketik `/` untuk ganti jenis blok
- Enter = blok baru · Backspace di baris kosong = hapus blok
- Seret handle `⋮⋮` untuk mengurutkan blok
- Tema terang / gelap
- UI guide: [UI-GUIDE.md](./UI-GUIDE.md)

## Stack

- React 19 + TypeScript
- Vite
- CSS variables (tanpa UI library)

## Jalankan

```bash
npm install
npm run dev
```

Build produksi:

```bash
npm run build
npm run preview
```

## Struktur

```
src/
  components/   Sidebar, Editor, BlockRow, SlashMenu
  lib/          storage, blocks, pages, id
  styles/       tokens + app
  types.ts
UI-GUIDE.md
```

## Roadmap berikutnya

1. Backend (Prisma) + auth
2. Deploy Vercel
3. Inline formatting (bold/italic)
