-- ============================================
-- SCRIPT DE VERIFICACIÓN DE RLS Y POLÍTICAS
-- ============================================
-- 
-- Este script te ayuda a verificar:
-- 1. Si RLS está habilitado en las tablas
-- 2. Qué políticas existen
-- 3. El estado actual de la configuración
--
-- ============================================

-- 1. Verificar si RLS está habilitado en las tablas
SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS Habilitado"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('clients', 'loans', 'transactions')
ORDER BY tablename;

-- 2. Ver todas las políticas existentes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as "Operación",
    qual as "USING",
    with_check as "WITH CHECK"
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('clients', 'loans', 'transactions')
ORDER BY tablename, cmd;

-- 3. Si RLS NO está habilitado, ejecuta esto para habilitarlo:
-- ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 4. Verificar el estado de RLS de forma más detallada
SELECT 
    t.tablename,
    t.rowsecurity as "RLS ON",
    COUNT(p.policyname) as "Número de Políticas"
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public' 
  AND t.tablename IN ('clients', 'loans', 'transactions')
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;

