import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { categoryFormSchema, type CategoryFormValues } from '@/lib/validation/admin'
import type { AdminCategory } from '@/hooks/useAdminCategories'
import { nameInLocale } from '@/lib/localized'

/**
 * Category create/edit dialog (Phase 10) — translated names in ar/fr/en
 * plus slug and sort order. The parent owns the mutation and closes the
 * dialog on success.
 */

type CategoryFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: AdminCategory | null
  saving: boolean
  errorKey: string | null
  onSubmit: (values: CategoryFormValues) => void
}

const LANG_FIELDS = [
  { code: 'ar', field: 'nameAr', dir: 'rtl' },
  { code: 'fr', field: 'nameFr', dir: 'ltr' },
  { code: 'en', field: 'nameEn', dir: 'ltr' },
] as const

export default function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  saving,
  errorKey,
  onSubmit,
}: CategoryFormDialogProps) {
  const { t } = useTranslation()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { slug: '', nameAr: '', nameFr: '', nameEn: '', sortOrder: '0' },
  })

  useEffect(() => {
    if (!open) return
    reset({
      slug: category?.slug ?? '',
      nameAr: category ? nameInLocale(category.name, 'ar') : '',
      nameFr: category ? nameInLocale(category.name, 'fr') : '',
      nameEn: category ? nameInLocale(category.name, 'en') : '',
      sortOrder: String(category?.sort_order ?? 0),
    })
  }, [open, category, reset])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {category ? t('admin.categories.edit_title') : t('admin.categories.create_title')}
          </DialogTitle>
          <DialogDescription>{t('admin.categories.dialog_body')}</DialogDescription>
        </DialogHeader>

        <form
          id="admin-category-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          {errorKey && (
            <p role="alert" className="text-sm text-destructive">
              {t(errorKey)}
            </p>
          )}
          {LANG_FIELDS.map(({ code, field, dir }) => (
            <div key={code} className="flex flex-col gap-2">
              <Label htmlFor={`cat-${field}`}>
                {t('admin.categories.field_name')} — {t(`admin.caftans.lang_${code}`)}
              </Label>
              <Input
                id={`cat-${field}`}
                dir={dir}
                aria-invalid={Boolean(errors[field])}
                {...register(field)}
              />
              {errors[field] && (
                <p role="alert" className="text-sm text-destructive">
                  {t(errors[field]?.message ?? '')}
                </p>
              )}
            </div>
          ))}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cat-slug">{t('admin.caftans.field_slug')}</Label>
              <Input
                id="cat-slug"
                dir="ltr"
                aria-invalid={Boolean(errors.slug)}
                {...register('slug')}
              />
              {errors.slug && (
                <p role="alert" className="text-sm text-destructive">
                  {t(errors.slug.message ?? '')}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cat-sort">{t('admin.categories.field_sort_order')}</Label>
              <Input
                id="cat-sort"
                dir="ltr"
                inputMode="numeric"
                aria-invalid={Boolean(errors.sortOrder)}
                {...register('sortOrder')}
              />
              {errors.sortOrder && (
                <p role="alert" className="text-sm text-destructive">
                  {t(errors.sortOrder.message ?? '')}
                </p>
              )}
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t('admin.caftans.cancel')}
          </Button>
          <Button type="submit" form="admin-category-form" disabled={saving}>
            {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
            {category ? t('admin.caftans.save_changes') : t('admin.categories.create_submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
