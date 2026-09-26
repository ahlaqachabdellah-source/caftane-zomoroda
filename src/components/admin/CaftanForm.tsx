import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { caftanFormSchema, type CaftanFormValues } from '@/lib/validation/admin'
import { localizedText, nameInLocale } from '@/lib/localized'
import { useLocale } from '@/hooks/useLocale'
import type { CatalogCaftan } from '@/lib/caftans'
import type { Category, CaftanStatus } from '@/types/database.types'

/**
 * Admin caftan form (Phase 10) — create & edit share this component.
 * Names are required in all three languages (the DB CHECK enforces it
 * too); descriptions are optional per language. Arabic inputs render
 * RTL regardless of the interface language.
 */

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'

const TEXTAREA_CLASS =
  'flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'

type CaftanFormProps = {
  caftan?: CatalogCaftan | null
  categories: Category[]
  saving: boolean
  onSubmit: (values: CaftanFormValues) => void
  onCancel: () => void
}

const DEFAULT_VALUES: CaftanFormValues = {
  slug: '',
  nameAr: '',
  nameFr: '',
  nameEn: '',
  descriptionAr: '',
  descriptionFr: '',
  descriptionEn: '',
  categoryId: '',
  pricePerDay: '',
  depositAmount: '',
  size: '',
  color: '',
  status: 'available',
  featured: false,
}

const LANG_FIELDS = [
  { code: 'ar', name: 'nameAr', description: 'descriptionAr', dir: 'rtl' },
  { code: 'fr', name: 'nameFr', description: 'descriptionFr', dir: 'ltr' },
  { code: 'en', name: 'nameEn', description: 'descriptionEn', dir: 'ltr' },
] as const

export default function CaftanForm({ caftan, categories, saving, onSubmit, onCancel }: CaftanFormProps) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CaftanFormValues>({
    resolver: zodResolver(caftanFormSchema),
    defaultValues: DEFAULT_VALUES,
  })

  // Edit mode: prefill once the caftan has loaded.
  useEffect(() => {
    if (!caftan) return
    reset({
      slug: caftan.slug,
      nameAr: nameInLocale(caftan.name, 'ar'),
      nameFr: nameInLocale(caftan.name, 'fr'),
      nameEn: nameInLocale(caftan.name, 'en'),
      descriptionAr: nameInLocale(caftan.description, 'ar'),
      descriptionFr: nameInLocale(caftan.description, 'fr'),
      descriptionEn: nameInLocale(caftan.description, 'en'),
      categoryId: caftan.category_id,
      pricePerDay: String(caftan.price_per_day),
      depositAmount: String(caftan.deposit_amount),
      size: caftan.size,
      color: caftan.color,
      status: caftan.status,
      featured: caftan.featured,
    })
  }, [caftan, reset])

  const fieldError = (key: keyof CaftanFormValues) =>
    errors[key] ? (
      <p role="alert" className="text-sm text-destructive">
        {t(errors[key]?.message ?? '')}
      </p>
    ) : null

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8" noValidate>
      {/* Translated content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {LANG_FIELDS.map(({ code, name, description, dir }) => (
          <fieldset
            key={code}
            className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4"
          >
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground rtl:tracking-normal">
              {t(`admin.caftans.lang_${code}`)}
            </legend>
            <div className="flex flex-col gap-2">
              <Label htmlFor={name}>{t('admin.caftans.field_name')}</Label>
              <Input id={name} dir={dir} aria-invalid={Boolean(errors[name])} {...register(name)} />
              {fieldError(name)}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={description}>{t('admin.caftans.field_description')}</Label>
              <textarea
                id={description}
                dir={dir}
                aria-invalid={Boolean(errors[description])}
                className={TEXTAREA_CLASS}
                {...register(description)}
              />
              {fieldError(description)}
            </div>
          </fieldset>
        ))}
      </div>

      {/* Classification & pricing */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="categoryId">{t('admin.caftans.field_category')}</Label>
          <select
            id="categoryId"
            aria-invalid={Boolean(errors.categoryId)}
            className={SELECT_CLASS}
            {...register('categoryId')}
          >
            <option value="">{t('admin.caftans.category_placeholder')}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {localizedText(category.name, locale)}
              </option>
            ))}
          </select>
          {fieldError('categoryId')}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="pricePerDay">{t('admin.caftans.field_price')}</Label>
          <Input
            id="pricePerDay"
            dir="ltr"
            inputMode="decimal"
            aria-invalid={Boolean(errors.pricePerDay)}
            {...register('pricePerDay')}
          />
          {fieldError('pricePerDay')}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="depositAmount">{t('admin.caftans.field_deposit')}</Label>
          <Input
            id="depositAmount"
            dir="ltr"
            inputMode="decimal"
            aria-invalid={Boolean(errors.depositAmount)}
            {...register('depositAmount')}
          />
          {fieldError('depositAmount')}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="size">{t('admin.caftans.field_size')}</Label>
          <Input id="size" aria-invalid={Boolean(errors.size)} {...register('size')} />
          {fieldError('size')}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="color">{t('admin.caftans.field_color')}</Label>
          <Input id="color" aria-invalid={Boolean(errors.color)} {...register('color')} />
          {fieldError('color')}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="slug">{t('admin.caftans.field_slug')}</Label>
          <Input
            id="slug"
            dir="ltr"
            placeholder="caftan-andalou-rouge"
            aria-invalid={Boolean(errors.slug)}
            {...register('slug')}
          />
          {fieldError('slug')}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="status">{t('admin.caftans.field_status')}</Label>
          <select
            id="status"
            aria-invalid={Boolean(errors.status)}
            className={SELECT_CLASS}
            {...register('status')}
          >
            {(['available', 'maintenance', 'retired'] as CaftanStatus[]).map((status) => (
              <option key={status} value={status}>
                {t(`admin.caftans.status_${status}`)}
              </option>
            ))}
          </select>
          {fieldError('status')}
        </div>

        <div className="flex items-end pb-1">
          <label className="inline-flex cursor-pointer items-center gap-3 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input accent-[var(--color-gold)]"
              {...register('featured')}
            />
            {t('admin.caftans.field_featured')}
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
          {caftan ? t('admin.caftans.save_changes') : t('admin.caftans.create_submit')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          {t('admin.caftans.cancel')}
        </Button>
      </div>
    </form>
  )
}
