type Props = {
  onBold: () => void
  onItalic: () => void
  onCode: () => void
  onLink: () => void
}

export function FormatToolbar({ onBold, onItalic, onCode, onLink }: Props) {
  return (
    <div className="format-toolbar" role="toolbar" aria-label="Format teks">
      <button type="button" onMouseDown={(e) => { e.preventDefault(); onBold() }} title="Bold">
        <strong>B</strong>
      </button>
      <button type="button" onMouseDown={(e) => { e.preventDefault(); onItalic() }} title="Italic">
        <em>I</em>
      </button>
      <button type="button" onMouseDown={(e) => { e.preventDefault(); onCode() }} title="Code">
        {'</>'}
      </button>
      <button type="button" onMouseDown={(e) => { e.preventDefault(); onLink() }} title="Link">
        Link
      </button>
    </div>
  )
}
