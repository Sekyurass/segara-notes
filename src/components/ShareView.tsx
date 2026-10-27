import { useEffect, useState } from 'react'
import { fetchSharedPage } from '../lib/api'
import type { Page } from '../types'
import { coverCss } from '../lib/storage'

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
      <div className="share-view">
        <div className="share-view-card">{error}</div>
      </div>
    )
  }

  if (!page) {
    return (
      <div className="share-view">
        <div className="share-view-card">Memuat halaman…</div>
      </div>
    )
  }

  const cover = coverCss(page.cover)

  return (
    <div className="share-view">
      <div className="share-banner">Mode baca · Segara Notes</div>
      {cover && <div className="page-cover share-cover" style={{ background: cover }} />}
      <article className="share-article">
        <div className="share-icon">{page.icon}</div>
        <h1>{page.title || 'Tanpa judul'}</h1>
        <div className="share-blocks">
          {page.blocks.map((block) => {
            if (block.type === 'divider') return <hr key={block.id} className="block-divider" />
            if (block.type === 'image' && block.imageUrl) {
              return (
                <figure key={block.id}>
                  <img className="block-image" src={block.imageUrl} alt={block.text || ''} />
                  {block.text && <figcaption>{block.text}</figcaption>}
                </figure>
              )
            }
            if (block.type === 'database') {
              return (
                <div key={block.id} className="share-db">
                  <h3>{block.text || 'Database'}</h3>
                  <p>{block.database?.rows.length ?? 0} baris</p>
                </div>
              )
            }
            const Tag =
              block.type === 'heading1'
                ? 'h1'
                : block.type === 'heading2'
                  ? 'h2'
                  : block.type === 'heading3'
                    ? 'h3'
                    : block.type === 'code'
                      ? 'pre'
                      : 'p'
            return (
              <Tag key={block.id} className={`share-block type-${block.type}`}>
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
