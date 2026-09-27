import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import LoadingState from '@/components/states/LoadingState'
import ErrorState from '@/components/states/ErrorState'
import EmptyState from '@/components/states/EmptyState'
import CategoryFormDialog from '@/components/admin/CategoryFormDialog'
import { useAdminCategories, type AdminCategory } from '@/hooks/useAdminCategories'
import { formatNumber } from '@/lib/format'
import { useLocale } from '@/hooks/useLocale'
import type { CategoryFormValues } from '@/lib/validation/admin'
import { nameInLocale } from '@/lib/localized'

/**
 * Admin category management (Phase 10). Each row shows the translated
 * names, slug, sort order and live caftan count; deleting a category
 * that still has caftans is blocked by the database (FK restrict) and
 * surfaces a clear, localized message.
 */
export default function AdminCategoriesPage() {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const { categories, loading, error, refetch, saving, saveCategory, deleteCategory } =
    useAdminCategories()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AdminCategory | null>(null)
  const [formErrorKey, setFormErrorKey] = useState<string | null>(null)
  const [noticeKey, setNoticeKey] = useState<string | null>(null)
  const [listErrorKey, setListErrorKey] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<AdminCategory | null>(null)
  const [deleting, setDeleting] = useState(false)

  function openCreate() {
    setEditing(null)
    setFormErrorKey(null)
    setDialogOpen(true)
  }

  function openEdit(category: AdminCategory) {
    setEditing(category)
    setFormErrorKey(null)
    setDialogOpen(true)
  }

  async function handleSubmit(values: CategoryFormValues) {
    setFormErrorKey(null)
    const result = await saveCategory(values, editing?.id)
    if (result.ok) {
      setDialogOpen(false)
      setNoticeKey(editing ? 'admin.categories.notice_saved' : 'admin.categories.notice_created')
      refetch()
    } else {
      setFormErrorKey(result.errorKey)
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    setListErrorKey(null)
    const result = await deleteCategory(pendingDelete.id)
    setDeleting(false)
    if (result.ok) {
      setPendingDelete(null)
      setNoticeKey('admin.categories.notice_deleted')
      refetch()
    } else {
      setPendingDelete(null)
      setListErrorKey(result.errorKey)
    }
  }

  if (loading) {
    return <LoadingState label={t('admin.loading')} className="py-24" />
  }
  if (error) {
    return (
      <ErrorState
        title={t('admin.load_error_title')}
        description={t('admin.categories.error_load')}
        onRetry={refetch}
        className="py-24"
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t('admin.categories.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('admin.categories.subtitle')}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus aria-hidden="true" />
          {t('admin.categories.new_cta')}
        </Button>
      </div>

      {noticeKey && (
        <p
          role="status"
          className="rounded-md border border-gold bg-accent px-4 py-3 text-sm text-foreground"
        >
          {t(noticeKey)}
        </p>
      )}
      {listErrorKey && (
        <p
          role="alert"
          className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {t(listErrorKey)}
        </p>
      )}

      {categories.length === 0 ? (
        <EmptyState
          title={t('admin.categories.empty_title')}
          description={t('admin.categories.empty_body')}
          action={<Button onClick={openCreate}>{t('admin.categories.new_cta')}</Button>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {categories.map((category) => (
            <li
              key={category.id}
              className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4 shadow-sm sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{nameInLocale(category.name, 'fr')}</p>
                <p className="text-sm text-muted-foreground">
                  <span dir="rtl">{nameInLocale(category.name, 'ar')}</span>
                  {' · '}
                  {nameInLocale(category.name, 'en')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
                  {category.slug} · {t('admin.categories.sort_order_short')}{' '}
                  {formatNumber(category.sort_order, locale)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {t('admin.categories.caftan_count', { count: category.caftan_count })}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={t('admin.categories.edit')}
                  onClick={() => openEdit(category)}
                >
                  <Pencil aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={t('admin.categories.delete')}
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => setPendingDelete(category)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <CategoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editing}
        saving={saving}
        errorKey={formErrorKey}
        onSubmit={(values) => void handleSubmit(values)}
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.categories.delete_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete ? nameInLocale(pendingDelete.name, 'fr') : ''} —{' '}
              {t('admin.categories.delete_body')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('admin.caftans.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleConfirmDelete()
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('admin.categories.delete_confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
