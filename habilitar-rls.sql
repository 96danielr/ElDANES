-- ============================================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- ============================================
-- 
-- INSTRUCCIONES:
-- 1. Ve a SQL Editor en Supabase
-- 2. Copia y pega este script
-- 3. Ejecuta (Run o Ctrl+Enter)
--
-- ============================================

-- Habilitar RLS en la tabla clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en la tabla loans
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en la tabla transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Verificar que se habilitó correctamente
SELECT 
    tablename,
    rowsecurity as "RLS Habilitado"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('clients', 'loans', 'transactions')
ORDER BY tablename;

