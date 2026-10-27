import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type Props = {
  onBold: () => void
  onItalic: () => void
  onCode: () => void
  onLink: () => void
}

export function FormatToolbar({ onBold, onItalic, onCode, onLink }: Props) {
  return (
    <Card
      className="absolute top-[-2.6rem] left-0 z-25 flex flex-row gap-0.5 p-1 shadow-md"
      role="toolbar"
      aria-label="Format teks"
    >
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onMouseDown={(e) => {
          e.preventDefault()
          onBold()
        }}
        title="Bold"
      >
        <strong>B</strong>
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onMouseDown={(e) => {
          e.preventDefault()
          onItalic()
        }}
        title="Italic"
      >
        <em>I</em>
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onMouseDown={(e) => {
          e.preventDefault()
          onCode()
        }}
        title="Code"
      >
        {'</>'}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onMouseDown={(e) => {
          e.preventDefault()
          onLink()
        }}
        title="Link"
      >
        Link
      </Button>
    </Card>
  )
}
