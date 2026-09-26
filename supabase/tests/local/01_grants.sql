-- ============================================================================
-- LOCAL TEST HARNESS ONLY — grants mirroring Supabase defaults.
-- Supabase grants broad table privileges to anon/authenticated and relies on
-- RLS for enforcement; we replicate that exactly so tests measure RLS, not
-- grants. Must run AFTER migrations (tables must exist).
-- ============================================================================

grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;

grant all on all tables in schema storage to anon, authenticated;
