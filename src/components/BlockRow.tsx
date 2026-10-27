import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { filterSlashItems } from '../lib/blocks'
import type { Block, BlockType } from '../types'
import { SlashMenu } from './SlashMenu'

type Props = {
  block: Block
  autoFocus?: boolean
  onChangeText: (text: string) => void
  onToggleTodo: () => void
  onEnter: () => void
  onBackspaceEmpty: () => void
  onChangeType: (type: BlockType, text?: string) => void
}

function autoResize(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

export function BlockRow({
  block,
  autoFocus,
  onChangeText,
  onToggleTodo,
  onEnter,
  onBackspaceEmpty,
  onChangeType,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashQuery, setSlashQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const items = filterSlashItems(slashQuery)

  useEffect(() => {
    autoResize(ref.current)
  }, [block.text, block.type])

  useEffect(() => {
    if (autoFocus) ref.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    setActiveIndex(0)
  }, [slashQuery])

  function syncSlash(value: string) {
    if (value.startsWith('/')) {
      setSlashOpen(true)
      setSlashQuery(value.slice(1))
    } else {
      setSlashOpen(false)
      setSlashQuery('')
    }
  }

  function applySlash(type: BlockType) {
    onChangeType(type, '')
    setSlashOpen(false)
    setSlashQuery('')
    requestAnimationFrame(() => ref.current?.focus())
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (slashOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => (i + 1) % Math.max(items.length, 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => (i - 1 + Math.max(items.length, 1)) % Math.max(items.length, 1))
        return
      }
      if (e.key === 'Enter' && items[activeIndex]) {
        e.preventDefault()
        applySlash(items[activeIndex].type)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setSlashOpen(false)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onEnter()
      return
    }

    if (e.key === 'Backspace' && block.text === '') {
      e.preventDefault()
      onBackspaceEmpty()
    }
  }

  return (
    <div className={`block-row${block.type === 'todo' && block.checked ? ' todo-done' : ''}`}>
      <button type="button" className="block-handle" tabIndex={-1} aria-label="Handle blok">
        ⋮⋮
      </button>

      <div className="block-body">
        {block.type === 'bullet' && <span className="bullet-mark">•</span>}
        {block.type === 'todo' && (
          <input
            className="todo-check"
            type="checkbox"
            checked={Boolean(block.checked)}
            onChange={onToggleTodo}
            aria-label="Centang to-do"
          />
        )}

        <textarea
          ref={ref}
          className="block-input"
          data-type={block.type}
          rows={1}
          value={block.text}
          placeholder={
            block.type === 'heading1'
              ? 'Heading 1'
              : block.type === 'heading2'
                ? 'Heading 2'
                : block.type === 'code'
                  ? 'Kode…'
                  : 'Ketik / untuk perintah'
          }
          onChange={(e) => {
            const value = e.target.value
            onChangeText(value)
            syncSlash(value)
            autoResize(e.target)
          }}
          onKeyDown={onKeyDown}
        />
      </div>

      {slashOpen && (
        <SlashMenu
          items={items}
          activeIndex={activeIndex}
          onHover={setActiveIndex}
          onSelect={applySlash}
        />
      )}
    </div>
  )
}
