import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { AdminCustomerListItem, AdminCustomerDetail } from '@/types/admin'
import { withRetry } from '@/lib/errors'

/**
 * Admin customer list (Phase 11) — profiles with role='customer' plus
 * booking aggregates, via admin_list_customers() (admin-only RPC).
 * Search runs client-side (boutique-scale customer base).
 */
type UseAdminCustomersResult = {
  customers: AdminCustomerListItem[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useAdminCustomers(): UseAdminCustomersResult {
  const [customers, setCustomers] = useState<AdminCustomerListItem[]>([])
  const [loading, setLoading] = useState<boolean>(() => supabase !== null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    const client = supabase
    setLoading(true)
    setError(null)

    const { data, error: rpcError } = await withRetry(() => client.rpc('admin_list_customers'))

    if (rpcError) {
      setError('admin.customers.error_load')
    } else {
      setCustomers((data ?? []) as AdminCustomerListItem[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const id = setTimeout(() => void load(), 0)
    return () => clearTimeout(id)
  }, [load])

  return { customers, loading, error, refetch: load }
}

type UseAdminCustomerResult = {
  detail: AdminCustomerDetail | null
  loading: boolean
  error: string | null
  notFound: boolean
}

export function useAdminCustomer(customerId: string | undefined): UseAdminCustomerResult {
  const [detail, setDetail] = useState<AdminCustomerDetail | null>(null)
  const [loading, setLoading] = useState<boolean>(() => supabase !== null)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const client = supabase
    if (!client || !customerId) return
    let cancelled = false
    const id = setTimeout(async () => {
      const { data, error: rpcError } = await client.rpc('admin_get_customer', {
        p_customer_id: customerId,
      })
      if (cancelled) return
      if (rpcError) {
        if (rpcError.code === 'P0002') setNotFound(true)
        else setError('admin.customers.error_load')
      } else {
        setDetail(data as AdminCustomerDetail)
      }
      setLoading(false)
    }, 0)
    return () => {
      cancelled = true
      clearTimeout(id)
    }
  }, [customerId])

  return { detail, loading, error, notFound }
}
