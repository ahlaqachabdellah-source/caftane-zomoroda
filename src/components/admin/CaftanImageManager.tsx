import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { getCaftanImageUrl, sortCaftanImages } from '@/lib/caftans'
import { altTextSchema } from '@/lib/validation/admin'
import { useCaftanImages } from '@/hooks/useCaftanImages'
import { cn } from '@/lib/utils'
import type { CaftanImage, LocalizedText } from '@/types/database.types'
import { nameInLocale } from '@/lib/localized'

/**
 * Caftan image manager (Phase 10) — upload (multiple), preview, reorder
 * with explicit up/down buttons (accessible; no drag-and-drop traps),
 * primary-image selection, per-locale alt text and confirmed deletion.
 * All operations go through useCaftanImages (storage + metadata rows);
 * storage writes are admin-only per the Phase 1 bucket policies.
 */

type CaftanImageManagerProps = {
  caftanId: string
  images: CaftanImage[]
  onChanged: () => void
}

const ALT_LANGS = [
  { code: 'ar', dir: 'rtl' },
  { code: 'fr', dir: 'ltr' },
  { code: 'en', dir: 'ltr' },
] as const

export default function CaftanImageManager({
  caftanId,
  images,
  onChanged,
}: CaftanImageManagerProps) {
  const { t } = useTranslation()
  const { busy, uploadImages, deleteImage, persistOrder, setPrimary, updateAltText } =
    useCaftanImages(caftanId)
  const fileInput = useRef<HTMLInputElement>(null)
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [noticeKey, setNoticeKey] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<CaftanImage | null>(null)
  const [altDrafts, setAltDrafts] = useState<Record<string, Partial<LocalizedText>>>({})

  const ordered = useMemo(() => sortCaftanImages(images), [images])

  async function run(result: Promise<{ ok: boolean; errorKey: string | null }>, notice: string) {
    setErrorKey(null)
    setNoticeKey(null)
    const outcome = await result
    if (outcome.ok) {
      setNoticeKey(notice)
      onChanged()
    } else {
      setErrorKey(outcome.errorKey)
    }
  }

  async function handleUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    await run(uploadImages(Array.from(fileList), ordered), 'admin.images.notice_uploaded')
    if (fileInput.current) fileInput.current.value = ''
  }

  async function handleMove(image: CaftanImage, direction: -1 | 1) {
    const ids = ordered.map((img) => img.id)
    const index = ids.indexOf(image.id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    await run(persistOrder(ids), 'admin.images.notice_reordered')
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return
    await run(deleteImage(pendingDelete), 'admin.images.notice_deleted')
    setPendingDelete(null)
  }

  function altValue(image: CaftanImage, code: keyof LocalizedText): string {
    const draft = altDrafts[image.id]
    if (draft && code in draft) return draft[code] ?? ''
    return image.alt_text ? nameInLocale(image.alt_text, code) : ''
  }

  async function handleAltSave(image: CaftanImage) {
    const draft = altDrafts[image.id]
    if (!draft) return
    for (const text of Object.values(draft)) {
      if (!altTextSchema.safeParse(text ?? '').success) {
        setErrorKey('validation.alt_max')
        return
      }
    }
    await run(updateAltText(image.id, draft), 'admin.images.notice_alt_saved')
    setAltDrafts((prev) => {
      const next = { ...prev }
      delete next[image.id]
      return next
    })
  }

  return (
    <section
      aria-labelledby="admin-images-title"
      className="rounded-xl border border-border bg-background p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="admin-images-title" className="font-display text-lg font-semibold text-foreground">
          {t('admin.images.title')}
        </h2>
        <div>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            className="sr-only"
            aria-label={t('admin.images.upload_aria')}
            onChange={(e) => void handleUpload(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            {busy ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus aria-hidden="true" />
            )}
            {t('admin.images.upload_cta')}
          </Button>
        </div>
      </div>

      {errorKey && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {t(errorKey)}
        </p>
      )}
      {noticeKey && (
        <p role="status" className="mt-3 text-sm text-primary">
          {t(noticeKey)}
        </p>
      )}

      {ordered.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t('admin.images.empty')}</p>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {ordered.map((image, index) => {
            const url = getCaftanImageUrl(image.storage_path, { width: 400 })
            return (
              <li
                key={image.id}
                className={cn(
                  'flex flex-col gap-3 rounded-lg border p-3',
                  image.is_primary ? 'border-gold bg-accent' : 'border-border',
                )}
              >
                <div className="relative overflow-hidden rounded-md bg-muted">
                  {url ? (
                    <img
                      src={url}
                      alt={
                        image.alt_text
                          ? nameInLocale(image.alt_text, 'fr') || nameInLocale(image.alt_text, 'en')
                          : ''
                      }
                      loading="lazy"
                      decoding="async"
                      className="aspect-[4/5] w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/5] w-full items-center justify-center text-xs text-muted-foreground">
                      {t('admin.images.no_preview')}
                    </div>
                  )}
                  {image.is_primary && (
                    <span className="absolute end-2 top-2 inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[11px] font-semibold text-foreground">
                      <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                      {t('admin.images.primary_badge')}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={busy || index === 0}
                    aria-label={t('admin.images.move_up')}
                    onClick={() => void handleMove(image, -1)}
                  >
                    <ArrowUp aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={busy || index === ordered.length - 1}
                    aria-label={t('admin.images.move_down')}
                    onClick={() => void handleMove(image, 1)}
                  >
                    <ArrowDown aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={busy || image.is_primary}
                    aria-label={t('admin.images.set_primary')}
                    aria-pressed={image.is_primary}
                    onClick={() => void run(setPrimary(image), 'admin.images.notice_primary')}
                  >
                    <Star
                      aria-hidden="true"
                      className={image.is_primary ? 'fill-gold text-gold' : ''}
                    />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={busy}
                    aria-label={t('admin.images.delete')}
                    className="ms-auto text-destructive hover:bg-destructive/10"
                    onClick={() => setPendingDelete(image)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>

                <div className="flex flex-col gap-2">
                  {ALT_LANGS.map(({ code, dir }) => (
                    <label key={code} className="flex items-center gap-2 text-xs">
                      <span className="w-6 shrink-0 font-semibold uppercase text-muted-foreground">
                        {code}
                      </span>
                      <Input
                        dir={dir}
                        value={altValue(image, code)}
                        aria-label={t(`admin.images.alt_${code}`)}
                        onChange={(e) =>
                          setAltDrafts((prev) => ({
                            ...prev,
                            [image.id]: { ...prev[image.id], [code]: e.target.value },
                          }))
                        }
                      />
                    </label>
                  ))}
                  {altDrafts[image.id] && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="self-start"
                      onClick={() => void handleAltSave(image)}
                    >
                      {t('admin.images.alt_save')}
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.images.delete_title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('admin.images.delete_body')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.images.delete_cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleConfirmDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('admin.images.delete_confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
