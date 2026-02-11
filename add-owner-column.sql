-- Migración: Agregar columna 'owner' a la tabla loans
-- Ejecutar en el SQL Editor de Supabase
-- Valores posibles: 'Juntos', 'Daniel', 'Néstor'

ALTER TABLE loans ADD COLUMN owner TEXT DEFAULT 'Juntos' NOT NULL;
