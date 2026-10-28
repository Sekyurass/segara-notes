import { useEffect, useState } from 'react'
import { resolveMediaUrl } from '@/lib/media'

type Props = {
  src: string
  alt?: string
  className?: string
}

export function LocalImage({ src, alt = '', className }: Props) {
  const [url, setUrl] = useState<string | null>(src.startsWith('idb:') ? null : src)

  useEffect(() => {
    let revoked: string | null = null
    let cancelled = false
    void resolveMediaUrl(src).then((resolved) => {
      if (cancelled) return
      if (resolved?.startsWith('blob:')) revoked = resolved
      setUrl(resolved)
    })
    return () => {
      cancelled = true
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [src])

  if (!url) {
    return (
      <div className={className ?? 'block-image grid place-items-center text-xs text-muted-foreground'}>
        Memuat…
      </div>
    )
  }

  return <img className={className} src={url} alt={alt} />
}
