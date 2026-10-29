import { useState } from 'react'
import {
  ACCENT_PRESETS,
  type AccentId,
  type AppPrefs,
  type Density,
} from '@/lib/prefs'
import type { ClickUpListOption } from '@/lib/clickup'
import { createId } from '@/lib/id'
import type { UserProfile } from '@/lib/profiles'
import type { TaskStatus, TaskStatusCategory } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

type Props = {
  open: boolean
  prefs: AppPrefs
  taskStatuses: TaskStatus[]
  displayName: string
  profiles: UserProfile[]
  activeProfileId: string
  onClose: () => void
  onChange: (prefs: AppPrefs) => void
  onChangeStatuses: (statuses: TaskStatus[]) => void
  onDisplayName: (name: string) => void
  onCreateProfile: (name: string) => void
  onSwitchProfile: (id: string) => void
  onClickupPing?: () => Promise<boolean>
  onClickupImport?: () => Promise<number>
  onClickupExport?: () => Promise<number>
  onClickupLoadLists?: () => Promise<ClickUpListOption[]>
}

export function SettingsPanel({
  open,
  prefs,
  taskStatuses,
  displayName,
  profiles,
  activeProfileId,
  onClose,
  onChange,
  onChangeStatuses,
  onDisplayName,
  onCreateProfile,
  onSwitchProfile,
  onClickupPing,
  onClickupImport,
  onClickupExport,
  onClickupLoadLists,
}: Props) {
  const [profileDraft, setProfileDraft] = useState('')
  const [cuMsg, setCuMsg] = useState('')
  const [cuLists, setCuLists] = useState<ClickUpListOption[]>([])
  const [cuLoadingLists, setCuLoadingLists] = useState(false)
  function patch(partial: Partial<AppPrefs>) {
    onChange({ ...prefs, ...partial })
  }

  function patchStatus(id: string, partial: Partial<TaskStatus>) {
    onChangeStatuses(taskStatuses.map((s) => (s.id === id ? { ...s, ...partial } : s)))
  }

  function addStatus() {
    onChangeStatuses([
      ...taskStatuses,
      {
        id: createId('st'),
        name: 'Status baru',
        color: '#64748b',
        category: 'open',
        order: taskStatuses.length,
      },
    ])
  }

  function removeStatus(id: string) {
    if (taskStatuses.length <= 1) return
    onChangeStatuses(taskStatuses.filter((s) => s.id !== id))
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[min(90vh,40rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pengaturan</DialogTitle>
          <DialogDescription>
            Tema ClickUp-style (violet), status tugas, dan integrasi opsional.
          </DialogDescription>
        </DialogHeader>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Tampilan</h3>
          <div className="space-y-2">
            <Label>Aksen warna</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ACCENT_PRESETS) as Exclude<AccentId, 'custom'>[]).map((id) => (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant={prefs.accent === id ? 'default' : 'outline'}
                  onClick={() => patch({ accent: id })}
                >
                  {ACCENT_PRESETS[id].label}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant={prefs.accent === 'custom' ? 'default' : 'outline'}
                onClick={() => patch({ accent: 'custom' })}
              >
                Custom
              </Button>
            </div>
            {prefs.accent === 'custom' && (
              <div className="flex items-center gap-3">
                <Input
                  type="range"
                  min={0}
                  max={360}
                  value={prefs.customHue}
                  onChange={(e) => patch({ customHue: Number(e.target.value) })}
                  className="h-8"
                  aria-label="Hue custom"
                />
                <span className="w-10 text-xs text-muted-foreground">{prefs.customHue}°</span>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Radius sudut ({prefs.radius.toFixed(2)}rem)</Label>
              <Input
                type="range"
                min={0}
                max={1.25}
                step={0.05}
                value={prefs.radius}
                onChange={(e) => patch({ radius: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Lebar editor ({prefs.editorMaxRem}rem)</Label>
              <Input
                type="range"
                min={36}
                max={64}
                step={1}
                value={prefs.editorMaxRem}
                onChange={(e) => patch({ editorMaxRem: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Skala font ({Math.round(prefs.fontScale * 100)}%)</Label>
              <Input
                type="range"
                min={0.9}
                max={1.2}
                step={0.05}
                value={prefs.fontScale}
                onChange={(e) => patch({ fontScale: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kepadatan UI</Label>
              <Select
                value={prefs.density}
                onValueChange={(v) => patch({ density: v as Density })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comfortable">Legawa</SelectItem>
                  <SelectItem value="compact">Ringkas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Profil & workspace</h3>
          <div className="space-y-1.5">
            <Label>Nama tampilan</Label>
            <Input
              value={displayName}
              onChange={(e) => onDisplayName(e.target.value)}
              placeholder="Nama kamu"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Profil aktif</Label>
            <Select value={activeProfileId} onValueChange={onSwitchProfile}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Nama profil baru"
              value={profileDraft}
              onChange={(e) => setProfileDraft(e.target.value)}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                if (!profileDraft.trim()) return
                onCreateProfile(profileDraft.trim())
                setProfileDraft('')
              }}
            >
              Tambah
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Setiap profil punya workspace terpisah (lokal + sync server).
          </p>
        </section>

        <Separator />

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Sync server</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Token harus sama dengan <code className="text-[0.7rem]">SEGARA_API_TOKEN</code> di
              server. Kosongkan jika server terbuka (dev).
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Token sync</Label>
            <Input
              type="password"
              value={prefs.apiToken}
              onChange={(e) => patch({ apiToken: e.target.value })}
              placeholder="Opsional · Bearer token"
              autoComplete="off"
            />
          </div>
        </section>

        <Separator />

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Notifikasi & aplikasi</h3>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2.5">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-primary"
              checked={prefs.notifyDue}
              onChange={(e) => patch({ notifyDue: e.target.checked })}
            />
            <span>
              <span className="block text-sm font-medium">Notifikasi jatuh tempo</span>
              <span className="text-xs text-muted-foreground">
                Kirim notifikasi OS untuk tugas overdue atau jatuh tempo hari ini.
              </span>
            </span>
          </label>
          <p className="text-xs text-muted-foreground">
            Install sebagai aplikasi (PWA): di browser, buka menu → Install / Tambahkan ke
            layar utama. Build produksi (`npm run build`) mengaktifkan service worker.
          </p>
        </section>

        <Separator />

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">ClickUp</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Impor / ekspor task ke list ClickUp (bukan halaman atau database).
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>API token</Label>
            <Input
              type="password"
              value={prefs.clickupToken}
              onChange={(e) => patch({ clickupToken: e.target.value })}
              placeholder="pk_…"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label>List tujuan</Label>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                disabled={!prefs.clickupToken || !onClickupLoadLists || cuLoadingLists}
                onClick={() => {
                  setCuLoadingLists(true)
                  void onClickupLoadLists?.()
                    .then((lists) => {
                      setCuLists(lists)
                      setCuMsg(
                        lists.length
                          ? `${lists.length} list ditemukan`
                          : 'Tidak ada list',
                      )
                    })
                    .catch(() => setCuMsg('Gagal memuat list'))
                    .finally(() => setCuLoadingLists(false))
                }}
              >
                {cuLoadingLists ? 'Memuat…' : 'Muat list'}
              </Button>
            </div>
            {cuLists.length > 0 ? (
              <Select
                value={prefs.clickupListId || undefined}
                onValueChange={(id) => patch({ clickupListId: id })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Pilih Space / List…" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {cuLists.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.spaceName}
                      {l.folderName ? ` / ${l.folderName}` : ''} / {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={prefs.clickupListId}
                onChange={(e) => patch({ clickupListId: e.target.value })}
                placeholder="List ID atau klik Muat list"
              />
            )}
          </div>
          <div className="space-y-2 rounded-lg border border-border px-3 py-2.5">
            <p className="text-xs font-medium">Mapping field</p>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={prefs.clickupMap.due}
                onChange={(e) =>
                  patch({
                    clickupMap: { ...prefs.clickupMap, due: e.target.checked },
                  })
                }
              />
              Due date
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={prefs.clickupMap.priority}
                onChange={(e) =>
                  patch({
                    clickupMap: { ...prefs.clickupMap, priority: e.target.checked },
                  })
                }
              />
              Priority
            </label>
            <div className="space-y-1.5 pt-1">
              <p className="text-xs text-muted-foreground">
                Status ClickUp → status lokal (nama status di ClickUp, case-insensitive)
              </p>
              {taskStatuses
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((status) => {
                  const alias =
                    Object.entries(prefs.clickupMap.statusByClickUp).find(
                      ([, id]) => id === status.id,
                    )?.[0] ?? ''
                  return (
                    <div key={status.id} className="flex items-center gap-2">
                      <span
                        className="w-20 shrink-0 truncate text-xs font-medium"
                        style={{ color: status.color }}
                        title={status.name}
                      >
                        {status.name}
                      </span>
                      <Input
                        className="h-8 text-xs"
                        placeholder="nama di ClickUp…"
                        value={alias}
                        onChange={(e) => {
                          const next = { ...prefs.clickupMap.statusByClickUp }
                          for (const [k, v] of Object.entries(next)) {
                            if (v === status.id) delete next[k]
                          }
                          const key = e.target.value.trim().toLowerCase()
                          if (key) next[key] = status.id
                          patch({
                            clickupMap: { ...prefs.clickupMap, statusByClickUp: next },
                          })
                        }}
                      />
                    </div>
                  )
                })}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!prefs.clickupToken || !onClickupPing}
              onClick={() => {
                void onClickupPing?.().then((ok) =>
                  setCuMsg(ok ? 'Token OK' : 'Token gagal / offline'),
                )
              }}
            >
              Tes token
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!prefs.clickupToken || !prefs.clickupListId || !onClickupImport}
              onClick={() => {
                void onClickupImport?.().then((n) =>
                  setCuMsg(n >= 0 ? `Impor ${n} task ke list aktif` : 'Impor gagal'),
                )
              }}
            >
              Impor → list aktif
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!prefs.clickupToken || !prefs.clickupListId || !onClickupExport}
              onClick={() => {
                void onClickupExport?.().then((n) =>
                  setCuMsg(
                    n >= 0 ? `Ekspor ${n} task dari list aktif` : 'Ekspor gagal',
                  ),
                )
              }}
            >
              Ekspor list aktif →
            </Button>
          </div>
          {cuMsg && <p className="text-xs text-muted-foreground">{cuMsg}</p>}
        </section>

        <Separator />

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Status tugas (kustom)</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Seperti ClickUp: kamu tentukan sendiri nama, warna, dan kategori status.
            </p>
          </div>
          <ul className="space-y-2">
            {taskStatuses
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((status) => (
                <li
                  key={status.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-2.5 py-2"
                >
                  <Input
                    type="color"
                    className="h-8 w-10 cursor-pointer p-1"
                    value={status.color}
                    onChange={(e) => patchStatus(status.id, { color: e.target.value })}
                    aria-label="Warna status"
                  />
                  <Input
                    className="h-8 min-w-[8rem] flex-1"
                    value={status.name}
                    onChange={(e) => patchStatus(status.id, { name: e.target.value })}
                  />
                  <Select
                    value={status.category}
                    onValueChange={(category) =>
                      patchStatus(status.id, { category: category as TaskStatusCategory })
                    }
                  >
                    <SelectTrigger className="h-8 w-[7.5rem]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={taskStatuses.length <= 1}
                    onClick={() => removeStatus(status.id)}
                  >
                    Hapus
                  </Button>
                </li>
              ))}
          </ul>
          <Button type="button" size="sm" variant="secondary" onClick={addStatus}>
            + Status
          </Button>
        </section>
      </DialogContent>
    </Dialog>
  )
}
