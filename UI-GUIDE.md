# UI Guide — Segara Notes

Panduan visual & interaksi untuk MVP. Semua token ada di `src/styles/tokens.css`.

## Arah desain

- **Metafora:** permukaan kertas tenang + aksen teal laut (`Segara`)
- **Bukan** tema ungu default / cream-serif terracotta / glow neon
- Tipografi: **IBM Plex Sans** (UI) + **IBM Plex Mono** (kode)
- Light & dark via `data-theme` di `<html>`

## Token warna

| Token | Light | Dark | Pakai untuk |
|-------|-------|------|-------------|
| `--bg` | `#F4F1EA` | `#141210` | Latar app |
| `--bg-elevated` | `#FFFCF7` | `#1C1916` | Sidebar, menu |
| `--text` | `#1C1916` | `#F5F0E8` | Teks utama |
| `--text-muted` | `#6B635A` | `#A89F93` | Hint, meta |
| `--accent` | `#0F766E` | `#2DD4BF` | CTA, fokus, active |
| `--accent-soft` | `#CCFBF1` | `#134E4A` | Highlight lembut |
| `--danger` | `#B42318` | `#F97066` | Hapus |

## Layout

```
┌────────────┬─────────────────────────────┐
│  Sidebar   │  Topbar (hint chip)         │
│  260px     ├─────────────────────────────┤
│  pages     │  Editor max 720px center    │
│            │  title + blocks             │
└────────────┴─────────────────────────────┘
```

- Sidebar: daftar halaman, buat/hapus, toggle tema
- Editor: judul besar + deretan blok
- Slash menu: floating di bawah blok aktif

## Komponen

### Sidebar
- Brand + toggle tema
- Tombol `+ Halaman`
- List page (ikon + judul), hapus muncul on hover

### Block types
| Type | Visual |
|------|--------|
| `paragraph` | body text |
| `heading1` | 1.65rem bold |
| `heading2` | 1.25rem semibold |
| `bullet` | mark `•` + teks |
| `todo` | checkbox + strikethrough jika checked |
| `code` | mono di surface muted |

### Slash menu (`/`)
- Buka jika teks blok diawali `/`
- Filter by label / keyword
- Keyboard: ↑↓ Enter Esc
- Mouse: hover + mousedown (supaya textarea tidak blur dulu)

## Interaksi keyboard

| Tombol | Aksi |
|--------|------|
| `/` di awal | Buka slash menu |
| `Enter` | Blok paragraf baru |
| `Backspace` di kosong | Hapus blok |
| `Shift+Enter` | Baris baru di dalam blok (textarea) |

## Spasi & radius

- Space scale: 4 / 8 / 12 / 16 / 24 / 32 / 48
- Radius: 6 / 10 / 14
- Gap antar blok: 2px (rapat seperti Notion)

## Skill / konsep yang dipakai

| Area | Skill |
|------|--------|
| State app | React `useState` + lift state di `App` |
| Persistensi | `localStorage` (`lib/storage.ts`) |
| Model dokumen | Page → Block[] (`types.ts`) |
| Command palette | Slash menu + filter keyword |
| Autoresize | textarea height = scrollHeight |
| Tema | CSS variables + `data-theme` |
| A11y dasar | `aria-label`, `role=listbox/option`, focus visible |

## Nanti (bukan MVP)

- Nested page / drag reorder
- Inline bold/italic
- Database / table
- Sync cloud / collab realtime
