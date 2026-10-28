import { useEffect, useId, useRef, useState } from 'react'
import {
  closeAppDialog,
  getAppDialog,
  subscribeAppDialog,
  type AppDialogRequest,
} from '@/lib/appDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function AppDialogHost() {
  const [req, setReq] = useState<AppDialogRequest | null>(() => getAppDialog())
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()

  useEffect(() => subscribeAppDialog(setReq), [])

  useEffect(() => {
    if (req?.kind === 'prompt') {
      setValue(req.defaultValue ?? '')
      const t = window.setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 40)
      return () => window.clearTimeout(t)
    }
  }, [req])

  const open = req !== null

  function onOpenChange(next: boolean) {
    if (next || !req) return
    if (req.kind === 'prompt') req.resolve(null)
    else if (req.kind === 'confirm') req.resolve(false)
    else req.resolve()
  }

  function submitPrompt() {
    if (req?.kind !== 'prompt') return
    const trimmed = value.trim()
    req.resolve(trimmed ? trimmed : null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden p-0 sm:max-w-[22.5rem]"
        onOpenAutoFocus={(e) => {
          if (req?.kind === 'prompt') e.preventDefault()
        }}
      >
        {req && (
          <>
            <DialogHeader className="gap-2 px-6 pt-6 pb-4 text-left sm:text-left">
              <DialogTitle className="text-[15px] font-semibold tracking-tight">
                {req.title}
              </DialogTitle>
              {req.description && (
                <DialogDescription className="text-[13px] leading-relaxed text-muted-foreground">
                  {req.description}
                </DialogDescription>
              )}
            </DialogHeader>

            {req.kind === 'prompt' && (
              <div className="px-6 pb-5">
                <label htmlFor={inputId} className="sr-only">
                  {req.title}
                </label>
                <Input
                  ref={inputRef}
                  id={inputId}
                  value={value}
                  placeholder={req.placeholder}
                  className="h-10 px-3.5 text-[14px]"
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      submitPrompt()
                    }
                  }}
                />
              </div>
            )}

            {req.kind !== 'prompt' && !req.description && <div className="h-1" />}

            <DialogFooter className="flex-row justify-end gap-2 border-t border-border/60 bg-muted/15 px-6 py-4 sm:space-x-0">
              {req.kind !== 'alert' && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 min-w-[4.5rem] px-4 text-[13px]"
                  onClick={() => {
                    if (req.kind === 'prompt') req.resolve(null)
                    else if (req.kind === 'confirm') req.resolve(false)
                  }}
                >
                  {req.kind === 'confirm' ? (req.cancelLabel ?? 'Batal') : 'Batal'}
                </Button>
              )}
              <Button
                type="button"
                variant={
                  req.kind === 'confirm' && req.destructive ? 'destructive' : 'default'
                }
                className="h-9 min-w-[4.5rem] px-4 text-[13px]"
                onClick={() => {
                  if (req.kind === 'prompt') submitPrompt()
                  else if (req.kind === 'confirm') req.resolve(true)
                  else req.resolve()
                }}
              >
                {req.kind === 'prompt'
                  ? (req.confirmLabel ?? 'Simpan')
                  : req.kind === 'confirm'
                    ? (req.confirmLabel ?? 'Lanjut')
                    : (req.confirmLabel ?? 'OK')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Optional: force-close from outside (e.g. route change). */
export function dismissAppDialog() {
  closeAppDialog()
}
