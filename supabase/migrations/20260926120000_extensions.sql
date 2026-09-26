-- ============================================================================
-- Migration 0001: Extensions
-- Moroccan Caftan Rental — Phase 1 (Database & Supabase backend)
--
-- btree_gist is required for the bookings overlap exclusion constraint
-- ( GiST index mixing a uuid equality and a daterange overlap operator ).
-- gen_random_uuid() is built into PostgreSQL 13+ / Supabase, no pgcrypto needed.
-- ============================================================================

create extension if not exists btree_gist;
