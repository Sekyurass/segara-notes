# Segara Notes

MVP catatan bergaya Notion: **sidebar halaman**, **block editor**, dan **slash menu** (`/`).  
Data disimpan di **localStorage** (belum ada backend).

## Fitur MVP

- Halaman: buat, pilih, hapus
- Blok: paragraf, H1, H2, bullet, to-do, code
- Ketik `/` untuk ganti jenis blok
- Enter = blok baru · Backspace di baris kosong = hapus blok
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
  lib/          storage, blocks, id
  styles/       tokens + app
  types.ts
UI-GUIDE.md
```

## Roadmap singkat

1. Drag & drop urutan blok
2. Nested pages
3. Backend (Prisma) + auth
4. Deploy Vercel
