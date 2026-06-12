-- ============================================
-- Columna "hasletra" — ElDANES
-- Ejecutar UNA VEZ en el SQL Editor de Supabase.
-- Todos los préstamos existentes quedan en
-- "no tiene letra" (false) por defecto.
-- ============================================

alter table loans add column if not exists hasletra boolean not null default false;
