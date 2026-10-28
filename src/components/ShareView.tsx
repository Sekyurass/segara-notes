import { useEffect, useState } from 'react'
import { fetchSharedPage, saveSharedPage } from '@/lib/api'
import type { Page } from '@/types'
import { coverCss } from '@/lib/storage'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { LocalImage } from '@/components/LocalImage'

type Props = {
  token: string
}

export function ShareView({ token }: Props) {
  const [page, setPage] = useState<Page | null>(null)
  const [canEdit, setCanEdit] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    void fetchSharedPage(token).then((data) => {
      if (cancelled) return
      if (!data) setError('Link share tidak valid atau API offline.')
      else {
        setPage(data.page)
        setCanEdit(data.canEdit)
      }
    })
    return () => {
      cancelled = true
    }
  }, [token])

  async function persist(next: Page) {
    setPage(next)
    if (!canEdit) return
    setSaving(true)
    await saveSharedPage(token, next)
    setSaving(false)
  }

  if (error) {
    return (
      <div className="grid min-h-svh place-items-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">{error}</CardContent>
        </Card>
      </div>
    )
  }

  if (!page) {
    return (
      <div className="grid min-h-svh place-items-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            Memuat halaman…
          </CardContent>
        </Card>
      </div>
    )
  }

  const cover = coverCss(page.cover)

  return (
    <div className="min-h-svh bg-background">
      <div className="flex items-center justify-center gap-2 bg-accent/50 px-4 py-2.5">
        <Badge variant="secondary">{canEdit ? 'Mode edit · Share' : 'Mode baca · Segara Notes'}</Badge>
        {canEdit && saving && <span className="text-[11px] text-muted-foreground">Menyimpan…</span>}
      </div>
      {cover && <div className="h-40" style={{ background: cover }} />}
      <article className="mx-auto w-[min(46rem,calc(100%-2rem))] py-8 pb-16">
        <div className="mb-2 text-4xl">{page.icon}</div>
        {canEdit ? (
          <Input
            className="mb-6 h-auto border-0 bg-transparent px-0 text-[clamp(1.8rem,3vw,2.4rem)] font-bold tracking-tight shadow-none focus-visible:ring-0"
            value={page.title}
            onChange={(e) => void persist({ ...page, title: e.target.value, updatedAt: Date.now() })}
          />
        ) : (
          <h1 className="mb-6 text-[clamp(1.8rem,3vw,2.4rem)] font-bold tracking-tight">
            {page.title || 'Tanpa judul'}
          </h1>
        )}
        <div className="flex flex-col gap-2.5">
          {page.blocks.map((block, index) => {
            if (block.type === 'divider') return <hr key={block.id} className="my-3 border-border" />
            if (block.type === 'image' && block.imageUrl) {
              return (
                <figure key={block.id}>
                  <LocalImage className="max-w-full rounded-lg" src={block.imageUrl} alt={block.text || ''} />
                  {block.text && (
                    <figcaption className="mt-1 text-sm text-muted-foreground">{block.text}</figcaption>
                  )}
                </figure>
              )
            }
            if (canEdit && (block.type === 'paragraph' || block.type === 'heading1' || block.type === 'heading2' || block.type === 'heading3')) {
              return (
                <textarea
                  key={block.id}
                  className="min-h-[2.5rem] w-full resize-y rounded-md border border-transparent bg-transparent px-1 py-1 text-sm outline-none hover:border-border focus:border-border"
                  value={block.text}
                  onChange={(e) => {
                    const blocks = page.blocks.map((b, i) =>
                      i === index ? { ...b, text: e.target.value } : b,
                    )
                    void persist({ ...page, blocks, updatedAt: Date.now() })
                  }}
                />
              )
            }
            if (block.type === 'todo') {
              return (
                <label key={block.id} className="flex items-start gap-2 text-sm">
                  <input type="checkbox" checked={Boolean(block.checked)} readOnly disabled={!canEdit} />
                  <span className={block.checked ? 'line-through text-muted-foreground' : ''}>
                    {block.text}
                  </span>
                </label>
              )
            }
            return (
              <p key={block.id} className="text-sm leading-relaxed whitespace-pre-wrap">
                {block.text}
              </p>
            )
          })}
        </div>
        {(page.comments?.length ?? 0) > 0 && (
          <section className="mt-10 border-t border-border pt-4">
            <h2 className="mb-2 text-sm font-semibold">Komentar</h2>
            <ul className="space-y-2">
              {page.comments!.map((c) => (
                <li key={c.id} className="rounded-md bg-muted/40 px-3 py-2 text-sm">
                  <div className="text-[10px] text-muted-foreground">
                    {c.author || 'Anonim'} · {new Date(c.createdAt).toLocaleString('id-ID')}
                  </div>
                  {c.text}
                </li>
              ))}
            </ul>
          </section>
        )}
        {canEdit && (
          <div className="mt-6">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() =>
                void persist({
                  ...page,
                  blocks: [
                    ...page.blocks,
                    {
                      id: `block-${Date.now()}`,
                      type: 'paragraph',
                      text: '',
                    },
                  ],
                  updatedAt: Date.now(),
                })
              }
            >
              + Paragraf
            </Button>
          </div>
        )}
      </article>
    </div>
  )
}
