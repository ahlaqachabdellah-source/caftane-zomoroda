/**
 * Database types for the Moroccan Caftan Rental Supabase schema.
 *
 * Hand-written to match supabase/migrations/* exactly (Phase 1).
 * Once the project is linked to a real Supabase instance, regenerate with:
 *   supabase gen types typescript --linked > src/types/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/** Translated content, keyed by locale. `ar`/`fr`/`en` are mandatory in the DB. */
export type LocalizedText = {
  ar: string
  fr: string
  en: string
}

export type UserRole = 'customer' | 'admin'

export type CaftanStatus = 'available' | 'maintenance' | 'retired'

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'completed'
  | 'cancelled'

export type DepositStatus = 'unpaid' | 'paid' | 'refunded' | 'forfeited'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          phone: string | null
          whatsapp_number: string | null
          city: string | null
          role: UserRole
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string
          phone?: string | null
          whatsapp_number?: string | null
          city?: string | null
          role?: UserRole
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          phone?: string | null
          whatsapp_number?: string | null
          city?: string | null
          role?: UserRole
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          slug: string
          name: Json
          description: Json
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: Json
          description?: Json
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: Json
          description?: Json
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      caftans: {
        Row: {
          id: string
          slug: string
          category_id: string
          name: Json
          description: Json
          size: string
          color: string
          price_per_day: number
          deposit_amount: number
          status: CaftanStatus
          featured: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          category_id: string
          name: Json
          description?: Json
          size?: string
          color?: string
          price_per_day: number
          deposit_amount?: number
          status?: CaftanStatus
          featured?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          category_id?: string
          name?: Json
          description?: Json
          size?: string
          color?: string
          price_per_day?: number
          deposit_amount?: number
          status?: CaftanStatus
          featured?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'caftans_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
        ]
      }
      caftan_images: {
        Row: {
          id: string
          caftan_id: string
          storage_path: string
          alt_text: Json
          sort_order: number
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          caftan_id: string
          storage_path: string
          alt_text?: Json
          sort_order?: number
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          caftan_id?: string
          storage_path?: string
          alt_text?: Json
          sort_order?: number
          is_primary?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'caftan_images_caftan_id_fkey'
            columns: ['caftan_id']
            isOneToOne: false
            referencedRelation: 'caftans'
            referencedColumns: ['id']
          },
        ]
      }
      bookings: {
        Row: {
          id: string
          booking_number: string
          customer_id: string
          caftan_id: string
          start_date: string
          end_date: string
          status: BookingStatus
          total_price: number
          deposit_status: DepositStatus
          customer_notes: string
          created_at: string
          updated_at: string
          rental_period: string
        }
        Insert: {
          id?: string
          booking_number?: string
          customer_id: string
          caftan_id: string
          start_date: string
          end_date: string
          status?: BookingStatus
          total_price: number
          deposit_status?: DepositStatus
          customer_notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          booking_number?: string
          customer_id?: string
          caftan_id?: string
          start_date?: string
          end_date?: string
          status?: BookingStatus
          total_price?: number
          deposit_status?: DepositStatus
          customer_notes?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'bookings_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bookings_caftan_id_fkey'
            columns: ['caftan_id']
            isOneToOne: false
            referencedRelation: 'caftans'
            referencedColumns: ['id']
          },
        ]
      }
      booking_status_history: {
        Row: {
          id: string
          booking_id: string
          from_status: BookingStatus | null
          to_status: BookingStatus
          changed_by: string | null
          note: string
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          from_status?: BookingStatus | null
          to_status: BookingStatus
          changed_by?: string | null
          note?: string
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          from_status?: BookingStatus | null
          to_status?: BookingStatus
          changed_by?: string | null
          note?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'booking_status_history_booking_id_fkey'
            columns: ['booking_id']
            isOneToOne: false
            referencedRelation: 'bookings'
            referencedColumns: ['id']
          },
        ]
      }
      booking_admin_notes: {
        Row: {
          booking_id: string
          notes: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          notes?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          notes?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'booking_admin_notes_booking_id_fkey'
            columns: ['booking_id']
            isOneToOne: true
            referencedRelation: 'bookings'
            referencedColumns: ['id']
          },
        ]
      }
      site_settings: {
        Row: {
          id: number
          whatsapp_number: string
          phone: string
          email: string
          address: Json
          social_links: Json
          seo_defaults: Json
          updated_at: string
        }
        Insert: {
          id?: number
          whatsapp_number?: string
          phone?: string
          email?: string
          address?: Json
          social_links?: Json
          seo_defaults?: Json
          updated_at?: string
        }
        Update: {
          id?: number
          whatsapp_number?: string
          phone?: string
          email?: string
          address?: Json
          social_links?: Json
          seo_defaults?: Json
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      admin_dashboard_kpis: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      admin_recent_activity: {
        Args: { p_limit?: number }
        Returns: Json
      }
      admin_list_bookings: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      admin_get_booking: {
        Args: { p_booking_id: string }
        Returns: Json
      }
      admin_update_booking_status: {
        Args: { p_booking_id: string; p_new_status: string; p_note?: string }
        Returns: Json
      }
      admin_set_booking_notes: {
        Args: { p_booking_id: string; p_notes: string }
        Returns: undefined
      }
      admin_list_customers: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      admin_get_customer: {
        Args: { p_customer_id: string }
        Returns: Json
      }
      admin_caftan_occupancy: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ---------------------------------------------------------------------------
// Convenience aliases used across the app
// ---------------------------------------------------------------------------
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Caftan = Database['public']['Tables']['caftans']['Row']
export type CaftanImage = Database['public']['Tables']['caftan_images']['Row']
export type Booking = Database['public']['Tables']['bookings']['Row']
export type BookingStatusHistory =
  Database['public']['Tables']['booking_status_history']['Row']
export type SiteSettings = Database['public']['Tables']['site_settings']['Row']
