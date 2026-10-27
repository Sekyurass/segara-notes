# Segara Notes

Catatan bergaya Notion: block editor, database sederhana, share link, dan sync API opsional.

## Fitur utama

- Halaman nested, favorit, trash, cover/icon, `Ctrl+K`
- Blok lengkap + **Database** (tabel / board)
- Inline format, `@` mention, slash menu
- **Share** read-only (`?share=TOKEN`, butuh API)
- **PIN** lokal (hash di browser)
- Sync SQLite + poll ringan antar tab/klien
- Export Markdown

## Jalankan

```bash
npm install
npm run db:migrate
npm run dev:api   # :8787
npm run dev       # Vite
```

Share & sync membutuhkan API. PIN tetap bekerja offline.
