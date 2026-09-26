import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import LoadingState from '@/components/states/LoadingState'
import ErrorState from '@/components/states/ErrorState'
import EmptyState from '@/components/states/EmptyState'
import CaftanForm from '@/components/admin/CaftanForm'
import CaftanImageManager from '@/components/admin/CaftanImageManager'
import { useAdminCaftan } from '@/hooks/useAdminCaftan'
import { useAdminCategories } from '@/hooks/useAdminCategories'
import { useCaftanMutations } from '@/hooks/useCaftanMutations'
import { useLocale } from '@/hooks/useLocale'
import type { CaftanFormValues } from '@/lib/validation/admin'

/**
 * Admin caftan create/edit page (Phase 10).
 * Create: bare form; on success the admin lands on the new caftan's edit
 * page (with a success notice) so images can be uploaded immediately.
 * Edit: prefilled form + the image manager below it.
 */
export default function AdminCaftanFormPage() {
  const { caftanId } = useParams()
  const isEdit = Boolean(caftanId)
  const { t } = useTranslation()
  const { localePath } = useLocale()
  const navigate = useNavigate()
  const location = useLocation()

  // Edit mode loads the caftan; create mode only needs the categories.
  const editQuery = useAdminCaftan(isEdit ? caftanId : undefined)
  const createCategories = useAdminCategories()
  const { saving, saveCaftan } = useCaftanMutations()
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const categories = isEdit ? editQuery.categories : createCategories.categories
  const categoriesLoading = isEdit ? editQuery.loading : createCategories.loading
  const justCreated = Boolean((location.state as { created?: boolean } | null)?.created)

  async function handleSubmit(values: CaftanFormValues) {
    setErrorKey(null)
    setSaved(false)
    const result = await saveCaftan(values, isEdit ? caftanId : undefined)
    if (!result.ok) {
      setErrorKey(result.errorKey)
      return
    }
    if (isEdit) {
      setSaved(true)
      editQuery.refetch()
    } else if (result.data) {
      navigate(localePath(`/admin/caftans/${result.data.id}/edit`), {
        replace: true,
        state: { created: true },
      })
    }
  }

  if (isEdit && editQuery.loading) {
    return <LoadingState label={t('admin.loading')} className="py-24" />
  }
  if (isEdit && editQuery.error) {
    return (
      <ErrorState
        title={t('admin.load_error_title')}
        description={t('admin.caftans.error_load')}
        onRetry={editQuery.refetch}
        className="py-24"
      />
    )
  }
  if (isEdit && editQuery.notFound) {
    return (
      <EmptyState
        title={t('admin.caftans.not_found_title')}
        description={t('admin.caftans.not_found_body')}
        action={
          <Link
            to={localePath('/admin/caftans')}
            className="text-sm font-medium text-foreground underline underline-offset-4"
          >
            {t('admin.caftans.back_to_list')}
          </Link>
        }
        className="py-24"
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to={localePath('/admin/caftans')}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          {t('admin.caftans.back_to_list')}
        </Link>
        <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {isEdit ? t('admin.caftans.edit_title') : t('admin.caftans.create_title')}
        </h1>
      </div>

      {justCreated && (
        <p role="status" className="rounded-md border border-gold bg-accent px-4 py-3 text-sm text-foreground">
          {t('admin.caftans.notice_created')}
        </p>
      )}
      {saved && !justCreated && (
        <p role="status" className="rounded-md border border-gold bg-accent px-4 py-3 text-sm text-foreground">
          {t('admin.caftans.notice_saved')}
        </p>
      )}
      {errorKey && (
        <p role="alert" className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {t(errorKey)}
        </p>
      )}

      {!categoriesLoading && categories.length === 0 ? (
        <EmptyState
          title={t('admin.caftans.no_categories_title')}
          description={t('admin.caftans.no_categories_body')}
          action={
            <Link
              to={localePath('/admin/categories')}
              className="text-sm font-medium text-foreground underline underline-offset-4"
            >
              {t('admin.nav_categories')}
            </Link>
          }
        />
      ) : (
        <CaftanForm
          caftan={isEdit ? editQuery.caftan : null}
          categories={categories}
          saving={saving}
          onSubmit={(values) => void handleSubmit(values)}
          onCancel={() => navigate(localePath('/admin/caftans'))}
        />
      )}

      {isEdit && editQuery.caftan && (
        <CaftanImageManager
          caftanId={editQuery.caftan.id}
          images={editQuery.caftan.images}
          onChanged={editQuery.refetch}
        />
      )}
    </div>
  )
}
