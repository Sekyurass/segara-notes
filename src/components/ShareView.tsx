import { useEffect, useState } from 'react'
import { fetchSharedPage } from '@/lib/api'
import type { Page } from '@/types'
import { coverCss } from '@/lib/storage'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

type Props = {
  token: string
}

export function ShareView({ token }: Props) {
  const [page, setPage] = useState<Page | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    void fetchSharedPage(token).then((data) => {
      if (cancelled) return
      if (!data) setError('Link share tidak valid atau API offline.')
      else setPage(data)
    })
    return () => {
      cancelled = true
    }
  }, [token])

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
      <div className="flex justify-center bg-accent/50 px-4 py-2.5">
        <Badge variant="secondary">Mode baca · Segara Notes</Badge>
      </div>
      {cover && <div className="h-40" style={{ background: cover }} />}
      <article className="mx-auto w-[min(46rem,calc(100%-2rem))] py-8 pb-16">
        <div className="mb-2 text-4xl">{page.icon}</div>
        <h1 className="mb-6 text-[clamp(1.8rem,3vw,2.4rem)] font-bold tracking-tight">
          {page.title || 'Tanpa judul'}
        </h1>
        <div className="flex flex-col gap-2.5">
          {page.blocks.map((block) => {
            if (block.type === 'divider') return <hr key={block.id} className="my-3 border-border" />
            if (block.type === 'image' && block.imageUrl) {
              return (
                <figure key={block.id}>
                  <img className="max-w-full rounded-lg" src={block.imageUrl} alt={block.text || ''} />
                  {block.text && (
                    <figcaption className="mt-1 text-sm text-muted-foreground">{block.text}</figcaption>
                  )}
                </figure>
              )
            }
            if (block.type === 'database') {
              return (
                <Card key={block.id} className="p-3 shadow-none">
                  <h3 className="font-semibold">{block.text || 'Database'}</h3>
                  <p className="text-sm text-muted-foreground">{block.database?.rows.length ?? 0} baris</p>
                </Card>
              )
            }
            const Tag =
              block.type === 'heading1'
                ? 'h2'
                : block.type === 'heading2'
                  ? 'h3'
                  : block.type === 'heading3'
                    ? 'h4'
                    : block.type === 'code'
                      ? 'pre'
                      : 'p'
            return (
              <Tag
                key={block.id}
                className={
                  block.type === 'heading1'
                    ? 'text-2xl font-bold'
                    : block.type === 'heading2'
                      ? 'text-xl font-semibold'
                      : block.type === 'heading3'
                        ? 'text-lg font-semibold'
                        : block.type === 'code'
                          ? 'overflow-auto rounded-md bg-muted p-3 font-mono text-sm'
                          : block.type === 'quote'
                            ? 'border-l-[3px] border-border pl-3 text-muted-foreground italic'
                            : 'leading-relaxed'
                }
              >
                {block.type === 'bullet' && '• '}
                {block.type === 'todo' && (block.checked ? '☑ ' : '☐ ')}
                {block.type === 'quote' && '“'}
                {block.text}
                {block.type === 'quote' && '”'}
              </Tag>
            )
          })}
        </div>
      </article>
    </div>
  )
}
