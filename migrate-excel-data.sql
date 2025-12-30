-- ============================================
-- SCRIPT DE MIGRACIÓN DE DATOS DE EXCEL
-- Sistema de Gestión de Préstamos
-- ============================================
-- 
-- INSTRUCCIONES:
-- 1. Ve a SQL Editor en Supabase
-- 2. Copia y pega este script
-- 3. Revisa y ajusta los datos según tu Excel
-- 4. Ejecuta el script (Run o Ctrl+Enter)
--
-- ============================================

-- Primero, insertamos los clientes
-- Nota: Ajusta los nombres y teléfonos según tu Excel

INSERT INTO clients (id, name, phone, createdat) VALUES
-- Genera UUIDs únicos para cada cliente
(gen_random_uuid(), 'Oscar Barberia', '', extract(epoch from now())::bigint * 1000),
(gen_random_uuid(), 'Profesor Hader', '', extract(epoch from now())::bigint * 1000),
(gen_random_uuid(), 'Profesora Vicky', '', extract(epoch from now())::bigint * 1000),
(gen_random_uuid(), 'Marlion Sinchi', '', extract(epoch from now())::bigint * 1000),
(gen_random_uuid(), 'Oscar Entrenador', '', extract(epoch from now())::bigint * 1000),
(gen_random_uuid(), 'Elena Diego', '', extract(epoch from now())::bigint * 1000),
(gen_random_uuid(), 'Sebastian Runmyprocess', '', extract(epoch from now())::bigint * 1000),
(gen_random_uuid(), 'Jose Zapata', '', extract(epoch from now())::bigint * 1000),
(gen_random_uuid(), 'Felix Killer', '', extract(epoch from now())::bigint * 1000),
(gen_random_uuid(), 'David GSE', '', extract(epoch from now())::bigint * 1000),
(gen_random_uuid(), 'Leidy Perez Migani', '', extract(epoch from now())::bigint * 1000),
(gen_random_uuid(), 'Tio Alejandro', '', extract(epoch from now())::bigint * 1000),
(gen_random_uuid(), 'Ángel David salchipapa', '', extract(epoch from now())::bigint * 1000),
(gen_random_uuid(), 'Koreano', '', extract(epoch from now())::bigint * 1000),
(gen_random_uuid(), 'JHON AIRE', '', extract(epoch from now())::bigint * 1000),
(gen_random_uuid(), 'Eulises Hurtado', '', extract(epoch from now())::bigint * 1000),
(gen_random_uuid(), 'Mery Sotto', '', extract(epoch from now())::bigint * 1000),
(gen_random_uuid(), 'Profesor Eider', '', extract(epoch from now())::bigint * 1000),
(gen_random_uuid(), 'Laura Macadamia', '', extract(epoch from now())::bigint * 1000),
(gen_random_uuid(), 'Sandoval', '', extract(epoch from now())::bigint * 1000),
(gen_random_uuid(), 'Juancho primo daniel', '', extract(epoch from now())::bigint * 1000),
(gen_random_uuid(), 'Alejandra Runmyprocress', '', extract(epoch from now())::bigint * 1000),
(gen_random_uuid(), 'Leonel Gym', '', extract(epoch from now())::bigint * 1000),
(gen_random_uuid(), 'Ahijado Felipe', '', extract(epoch from now())::bigint * 1000)
ON CONFLICT DO NOTHING;

-- Ahora insertamos los préstamos
-- Nota: Ajusta los valores según tu Excel
-- IMPORTANTE: Necesitas los IDs de los clientes que acabas de insertar

-- Función helper para obtener el ID del cliente por nombre
WITH client_ids AS (
  SELECT id, name FROM clients
)
INSERT INTO loans (id, clientid, initialcapital, currentcapital, monthlyrate, startdate, isactive)
SELECT 
  gen_random_uuid(),
  ci.id,
  -- Capital (remover puntos y comas, convertir a número)
  CASE 
    WHEN name = 'Oscar Barberia' THEN 12975000
    WHEN name = 'Profesor Hader' THEN 2500000
    WHEN name = 'Profesora Vicky' THEN 5000000
    WHEN name = 'Marlion Sinchi' THEN 868787
    WHEN name = 'Oscar Entrenador' THEN 4395875
    WHEN name = 'Elena Diego' THEN 1000000
    WHEN name = 'Sebastian Runmyprocess' THEN 1400000
    WHEN name = 'Jose Zapata' THEN 1000000
    WHEN name = 'Felix Killer' THEN 5000000
    WHEN name = 'David GSE' THEN 6000000
    WHEN name = 'Leidy Perez Migani' THEN 4300000
    WHEN name = 'Tio Alejandro' THEN 5000000
    WHEN name = 'Ángel David salchipapa' THEN 5000000
    WHEN name = 'Koreano' THEN 9000000
    WHEN name = 'JHON AIRE' THEN 1000000
    WHEN name = 'Eulises Hurtado' THEN 500000
    WHEN name = 'Mery Sotto' THEN 5000000
    WHEN name = 'Profesor Eider' THEN 500000
    WHEN name = 'Laura Macadamia' THEN 1500000
    WHEN name = 'Sandoval' THEN 2000000
    WHEN name = 'Juancho primo daniel' THEN 1500000
    WHEN name = 'Alejandra Runmyprocress' THEN 2000000
    WHEN name = 'Leonel Gym' THEN 2000000
    WHEN name = 'Ahijado Felipe' THEN 2000000
    ELSE 0
  END as initialcapital,
  -- Current capital es igual al initial capital al inicio
  CASE 
    WHEN name = 'Oscar Barberia' THEN 12975000
    WHEN name = 'Profesor Hader' THEN 2500000
    WHEN name = 'Profesora Vicky' THEN 5000000
    WHEN name = 'Marlion Sinchi' THEN 868787
    WHEN name = 'Oscar Entrenador' THEN 4395875
    WHEN name = 'Elena Diego' THEN 1000000
    WHEN name = 'Sebastian Runmyprocess' THEN 1400000
    WHEN name = 'Jose Zapata' THEN 1000000
    WHEN name = 'Felix Killer' THEN 5000000
    WHEN name = 'David GSE' THEN 6000000
    WHEN name = 'Leidy Perez Migani' THEN 4300000
    WHEN name = 'Tio Alejandro' THEN 5000000
    WHEN name = 'Ángel David salchipapa' THEN 5000000
    WHEN name = 'Koreano' THEN 9000000
    WHEN name = 'JHON AIRE' THEN 1000000
    WHEN name = 'Eulises Hurtado' THEN 500000
    WHEN name = 'Mery Sotto' THEN 5000000
    WHEN name = 'Profesor Eider' THEN 500000
    WHEN name = 'Laura Macadamia' THEN 1500000
    WHEN name = 'Sandoval' THEN 2000000
    WHEN name = 'Juancho primo daniel' THEN 1500000
    WHEN name = 'Alejandra Runmyprocress' THEN 2000000
    WHEN name = 'Leonel Gym' THEN 2000000
    WHEN name = 'Ahijado Felipe' THEN 2000000
    ELSE 0
  END as currentcapital,
  -- Tasa mensual (%)
  CASE 
    WHEN name = 'Oscar Barberia' THEN 5
    WHEN name = 'Profesor Hader' THEN 8
    WHEN name = 'Profesora Vicky' THEN 6
    WHEN name = 'Marlion Sinchi' THEN 6
    WHEN name = 'Oscar Entrenador' THEN 10
    WHEN name = 'Elena Diego' THEN 8
    WHEN name = 'Sebastian Runmyprocess' THEN 7
    WHEN name = 'Jose Zapata' THEN 10
    WHEN name = 'Felix Killer' THEN 6
    WHEN name = 'David GSE' THEN 7
    WHEN name = 'Leidy Perez Migani' THEN 6
    WHEN name = 'Tio Alejandro' THEN 7
    WHEN name = 'Ángel David salchipapa' THEN 6
    WHEN name = 'Koreano' THEN 5
    WHEN name = 'JHON AIRE' THEN 20
    WHEN name = 'Eulises Hurtado' THEN 6
    WHEN name = 'Mery Sotto' THEN 7
    WHEN name = 'Profesor Eider' THEN 4
    WHEN name = 'Laura Macadamia' THEN 7
    WHEN name = 'Sandoval' THEN 3
    WHEN name = 'Juancho primo daniel' THEN 10
    WHEN name = 'Alejandra Runmyprocress' THEN 7.5
    WHEN name = 'Leonel Gym' THEN 7.5
    WHEN name = 'Ahijado Felipe' THEN 7.5
    ELSE 0
  END as monthlyrate,
  -- Fecha de inicio (convertir DD/MM/YYYY a timestamp)
  CASE 
    WHEN name = 'Oscar Barberia' THEN extract(epoch from '2025-01-01'::date)::bigint * 1000
    WHEN name = 'Profesor Hader' THEN extract(epoch from '2025-01-01'::date)::bigint * 1000
    WHEN name = 'Profesora Vicky' THEN extract(epoch from '2025-01-01'::date)::bigint * 1000
    WHEN name = 'Marlion Sinchi' THEN extract(epoch from '2025-09-05'::date)::bigint * 1000
    WHEN name = 'Oscar Entrenador' THEN extract(epoch from '2025-09-07'::date)::bigint * 1000
    WHEN name = 'Elena Diego' THEN extract(epoch from '2025-01-01'::date)::bigint * 1000
    WHEN name = 'Sebastian Runmyprocess' THEN extract(epoch from '2025-09-23'::date)::bigint * 1000
    WHEN name = 'Jose Zapata' THEN extract(epoch from '2025-01-01'::date)::bigint * 1000
    WHEN name = 'Felix Killer' THEN extract(epoch from '2025-01-01'::date)::bigint * 1000
    WHEN name = 'David GSE' THEN extract(epoch from '2025-11-15'::date)::bigint * 1000
    WHEN name = 'Leidy Perez Migani' THEN extract(epoch from '2025-01-01'::date)::bigint * 1000
    WHEN name = 'Tio Alejandro' THEN extract(epoch from '2025-09-01'::date)::bigint * 1000
    WHEN name = 'Ángel David salchipapa' THEN extract(epoch from '2025-10-22'::date)::bigint * 1000
    WHEN name = 'Koreano' THEN extract(epoch from '2025-10-24'::date)::bigint * 1000
    WHEN name = 'JHON AIRE' THEN extract(epoch from '2025-10-28'::date)::bigint * 1000
    WHEN name = 'Eulises Hurtado' THEN extract(epoch from '2025-01-01'::date)::bigint * 1000
    WHEN name = 'Mery Sotto' THEN extract(epoch from '2025-01-01'::date)::bigint * 1000
    WHEN name = 'Profesor Eider' THEN extract(epoch from '2025-12-05'::date)::bigint * 1000
    WHEN name = 'Laura Macadamia' THEN extract(epoch from '2025-12-05'::date)::bigint * 1000
    WHEN name = 'Sandoval' THEN extract(epoch from '2025-12-13'::date)::bigint * 1000
    WHEN name = 'Juancho primo daniel' THEN extract(epoch from '2025-01-01'::date)::bigint * 1000
    WHEN name = 'Alejandra Runmyprocress' THEN extract(epoch from '2025-01-01'::date)::bigint * 1000
    WHEN name = 'Leonel Gym' THEN extract(epoch from '2025-01-01'::date)::bigint * 1000
    WHEN name = 'Ahijado Felipe' THEN extract(epoch from '2025-01-01'::date)::bigint * 1000
    ELSE extract(epoch from now())::bigint * 1000
  END as startdate,
  true as isactive
FROM client_ids ci
WHERE ci.name IN (
  'Oscar Barberia', 'Profesor Hader', 'Profesora Vicky', 'Marlion Sinchi',
  'Oscar Entrenador', 'Elena Diego', 'Sebastian Runmyprocess', 'Jose Zapata',
  'Felix Killer', 'David GSE', 'Leidy Perez Migani', 'Tio Alejandro',
  'Ángel David salchipapa', 'Koreano', 'JHON AIRE', 'Eulises Hurtado',
  'Mery Sotto', 'Profesor Eider', 'Laura Macadamia', 'Sandoval',
  'Juancho primo daniel', 'Alejandra Runmyprocress', 'Leonel Gym', 'Ahijado Felipe'
);

-- Insertar transacciones de apertura para cada préstamo
INSERT INTO transactions (id, loanid, amount, date, description)
SELECT 
  gen_random_uuid(),
  l.id,
  0,
  l.startdate,
  'APERTURA DE CRÉDITO'
FROM loans l
WHERE l.isactive = true;

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Ejecuta esto después para verificar los datos:

-- SELECT COUNT(*) as total_clientes FROM clients;
-- SELECT COUNT(*) as total_prestamos FROM loans WHERE isactive = true;
-- SELECT COUNT(*) as total_transacciones FROM transactions;

-- Ver préstamos activos con sus clientes:
-- SELECT 
--   c.name,
--   l.initialcapital,
--   l.currentcapital,
--   l.monthlyrate,
--   to_timestamp(l.startdate / 1000) as fecha_inicio
-- FROM loans l
-- JOIN clients c ON l.clientid = c.id
-- WHERE l.isactive = true
-- ORDER BY c.name;

