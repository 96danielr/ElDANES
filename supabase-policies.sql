-- ============================================
-- POLÍTICAS DE SEGURIDAD PARA SUPABASE
-- Sistema de Gestión de Préstamos
-- ============================================
-- 
-- INSTRUCCIONES:
-- 1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
-- 2. Selecciona tu proyecto
-- 3. Ve a "SQL Editor" en el menú lateral
-- 4. Copia y pega TODO este archivo
-- 5. Haz clic en "Run" o presiona Ctrl+Enter
--
-- ============================================

-- Primero, eliminamos políticas existentes si las hay (opcional, comenta si prefieres mantenerlas)
-- DROP POLICY IF EXISTS "Allow all operations on clients" ON clients;
-- DROP POLICY IF EXISTS "Allow all operations on loans" ON loans;
-- DROP POLICY IF EXISTS "Allow all operations on transactions" ON transactions;

-- ============================================
-- TABLA: clients
-- ============================================

-- Política para SELECT (leer)
DROP POLICY IF EXISTS "Allow select clients" ON clients;
CREATE POLICY "Allow select clients" ON clients
FOR SELECT
TO anon, authenticated
USING (true);

-- Política para INSERT (crear)
DROP POLICY IF EXISTS "Allow insert clients" ON clients;
CREATE POLICY "Allow insert clients" ON clients
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Política para UPDATE (actualizar)
DROP POLICY IF EXISTS "Allow update clients" ON clients;
CREATE POLICY "Allow update clients" ON clients
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Política para DELETE (eliminar)
DROP POLICY IF EXISTS "Allow delete clients" ON clients;
CREATE POLICY "Allow delete clients" ON clients
FOR DELETE
TO anon, authenticated
USING (true);

-- ============================================
-- TABLA: loans
-- ============================================

-- Política para SELECT (leer)
DROP POLICY IF EXISTS "Allow select loans" ON loans;
CREATE POLICY "Allow select loans" ON loans
FOR SELECT
TO anon, authenticated
USING (true);

-- Política para INSERT (crear)
DROP POLICY IF EXISTS "Allow insert loans" ON loans;
CREATE POLICY "Allow insert loans" ON loans
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Política para UPDATE (actualizar)
DROP POLICY IF EXISTS "Allow update loans" ON loans;
CREATE POLICY "Allow update loans" ON loans
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Política para DELETE (eliminar)
DROP POLICY IF EXISTS "Allow delete loans" ON loans;
CREATE POLICY "Allow delete loans" ON loans
FOR DELETE
TO anon, authenticated
USING (true);

-- ============================================
-- TABLA: transactions
-- ============================================

-- Política para SELECT (leer)
DROP POLICY IF EXISTS "Allow select transactions" ON transactions;
CREATE POLICY "Allow select transactions" ON transactions
FOR SELECT
TO anon, authenticated
USING (true);

-- Política para INSERT (crear)
DROP POLICY IF EXISTS "Allow insert transactions" ON transactions;
CREATE POLICY "Allow insert transactions" ON transactions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Política para UPDATE (actualizar) - por si acaso
DROP POLICY IF EXISTS "Allow update transactions" ON transactions;
CREATE POLICY "Allow update transactions" ON transactions
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Política para DELETE (eliminar)
DROP POLICY IF EXISTS "Allow delete transactions" ON transactions;
CREATE POLICY "Allow delete transactions" ON transactions
FOR DELETE
TO anon, authenticated
USING (true);

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Para verificar que las políticas se crearon correctamente, ejecuta:
-- SELECT * FROM pg_policies WHERE schemaname = 'public';

