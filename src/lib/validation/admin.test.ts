import { describe, expect, it } from 'vitest'
import {
  actionNoteSchema,
  adminNotesSchema,
  altTextSchema,
  categoryFormSchema,
  caftanFormSchema,
} from './admin'

const VALID_CAFTAN = {
  slug: 'caftan-test-1',
  nameAr: 'قفطان اختبار',
  nameFr: 'Caftan Test',
  nameEn: 'Test Caftan',
  descriptionAr: '',
  descriptionFr: 'Une description',
  descriptionEn: '',
  categoryId: '10000000-0000-0000-0000-000000000001',
  pricePerDay: '800',
  depositAmount: '2000.50',
  size: 'M',
  color: 'Rouge',
  status: 'available' as const,
  featured: false,
}

describe('caftanFormSchema', () => {
  it('accepts a fully valid caftan', () => {
    expect(caftanFormSchema.safeParse(VALID_CAFTAN).success).toBe(true)
  })

  it.each([
    ['Invalid Slug!', 'slug_invalid'],
    ['double--dash', 'slug_invalid'],
    ['-leading', 'slug_invalid'],
    ['', 'slug_required'],
  ])('rejects slug %s', (slug, key) => {
    const r = caftanFormSchema.safeParse({ ...VALID_CAFTAN, slug })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toBe(`validation.${key}`)
  })

  it.each(['-10', 'abc', '1.234', ''])('rejects invalid price %s', (pricePerDay) => {
    const r = caftanFormSchema.safeParse({ ...VALID_CAFTAN, pricePerDay })
    expect(r.success).toBe(false)
  })

  it.each(['0', '650', '1200.25'])('accepts valid price %s', (pricePerDay) => {
    expect(caftanFormSchema.safeParse({ ...VALID_CAFTAN, pricePerDay }).success).toBe(true)
  })

  it('requires all three translated names', () => {
    for (const field of ['nameAr', 'nameFr', 'nameEn'] as const) {
      const r = caftanFormSchema.safeParse({ ...VALID_CAFTAN, [field]: ' ' })
      expect(r.success).toBe(false)
    }
  })

  it('rejects an unknown status', () => {
    const r = caftanFormSchema.safeParse({ ...VALID_CAFTAN, status: 'hidden' })
    expect(r.success).toBe(false)
  })

  it('requires a category', () => {
    const r = caftanFormSchema.safeParse({ ...VALID_CAFTAN, categoryId: '' })
    expect(r.success).toBe(false)
  })
})

describe('categoryFormSchema', () => {
  const VALID = {
    slug: 'mariage',
    nameAr: 'زفاف',
    nameFr: 'Mariage',
    nameEn: 'Wedding',
    sortOrder: '1',
  }

  it('accepts a valid category', () => {
    expect(categoryFormSchema.safeParse(VALID).success).toBe(true)
  })

  it('rejects a non-integer sort order', () => {
    expect(categoryFormSchema.safeParse({ ...VALID, sortOrder: '1.5' }).success).toBe(false)
    expect(categoryFormSchema.safeParse({ ...VALID, sortOrder: '-1' }).success).toBe(false)
  })

  it('rejects an unsafe slug', () => {
    expect(categoryFormSchema.safeParse({ ...VALID, slug: 'Mariage été' }).success).toBe(false)
  })
})

describe('altTextSchema', () => {
  it('accepts empty and normal alt text', () => {
    expect(altTextSchema.safeParse('').success).toBe(true)
    expect(altTextSchema.safeParse('Caftan rouge, vue de face').success).toBe(true)
  })

  it('rejects overly long alt text', () => {
    expect(altTextSchema.safeParse('x'.repeat(201)).success).toBe(false)
  })
})

describe('adminNotesSchema (Phase 12)', () => {
  it('accepts empty and normal notes, trims whitespace', () => {
    expect(adminNotesSchema.safeParse('').success).toBe(true)
    expect(adminNotesSchema.safeParse('  Dossier VIP  ').data).toBe('Dossier VIP')
  })

  it('rejects notes over 2000 characters with the localized key', () => {
    const res = adminNotesSchema.safeParse('x'.repeat(2001))
    expect(res.success).toBe(false)
    expect(res.error?.issues[0]?.message).toBe('validation.admin_notes_max')
  })
})

describe('actionNoteSchema (Phase 12)', () => {
  it('accepts a short customer-visible reason', () => {
    expect(actionNoteSchema.safeParse('Retard de retour').success).toBe(true)
  })

  it('rejects notes over 500 characters', () => {
    const res = actionNoteSchema.safeParse('x'.repeat(501))
    expect(res.success).toBe(false)
    expect(res.error?.issues[0]?.message).toBe('validation.notes_max')
  })
})
