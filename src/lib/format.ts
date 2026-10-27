/** Bungkus seleksi di textarea dengan marker markdown-lite. */
export function wrapSelection(
  value: string,
  start: number,
  end: number,
  before: string,
  after: string = before,
): { value: string; start: number; end: number } {
  const selected = value.slice(start, end)
  const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`
  if (selected) {
    return {
      value: next,
      start: start + before.length,
      end: start + before.length + selected.length,
    }
  }
  return {
    value: next,
    start: start + before.length,
    end: start + before.length,
  }
}

export function wrapLink(
  value: string,
  start: number,
  end: number,
  url: string,
): { value: string; start: number; end: number } {
  const selected = value.slice(start, end) || 'tautan'
  const inserted = `[${selected}](${url})`
  const next = `${value.slice(0, start)}${inserted}${value.slice(end)}`
  return {
    value: next,
    start: start + 1,
    end: start + 1 + selected.length,
  }
}
