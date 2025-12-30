  -- ============================================
  -- SCRIPT SIMPLIFICADO DE MIGRACIÓN
  -- Versión más fácil de editar manualmente
  -- ============================================

  -- PASO 1: Insertar clientes
  -- Puedes agregar teléfonos si los tienes
  INSERT INTO clients (name, phone, createdat) VALUES
  ('Oscar Barberia', '', extract(epoch from now())::bigint * 1000),
  ('Profesor Hader', '', extract(epoch from now())::bigint * 1000),
  ('Profesora Vicky', '', extract(epoch from now())::bigint * 1000),
  ('Marlion Sinchi', '', extract(epoch from now())::bigint * 1000),
  ('Oscar Entrenador', '', extract(epoch from now())::bigint * 1000),
  ('Elena Diego', '', extract(epoch from now())::bigint * 1000),
  ('Sebastian Runmyprocess', '', extract(epoch from now())::bigint * 1000),
  ('Jose Zapata', '', extract(epoch from now())::bigint * 1000),
  ('Felix Killer', '', extract(epoch from now())::bigint * 1000),
  ('David GSE', '', extract(epoch from now())::bigint * 1000),
  ('Leidy Perez Migani', '', extract(epoch from now())::bigint * 1000),
  ('Tio Alejandro', '', extract(epoch from now())::bigint * 1000),
  ('Ángel David salchipapa', '', extract(epoch from now())::bigint * 1000),
  ('Koreano', '', extract(epoch from now())::bigint * 1000),
  ('JHON AIRE', '', extract(epoch from now())::bigint * 1000),
  ('Eulises Hurtado', '', extract(epoch from now())::bigint * 1000),
  ('Mery Sotto', '', extract(epoch from now())::bigint * 1000),
  ('Profesor Eider', '', extract(epoch from now())::bigint * 1000),
  ('Laura Macadamia', '', extract(epoch from now())::bigint * 1000),
  ('Sandoval', '', extract(epoch from now())::bigint * 1000),
  ('Juancho primo daniel', '', extract(epoch from now())::bigint * 1000),
  ('Alejandra Runmyprocress', '', extract(epoch from now())::bigint * 1000),
  ('Leonel Gym', '', extract(epoch from now())::bigint * 1000),
  ('Ahijado Felipe', '', extract(epoch from now())::bigint * 1000);

-- PASO 2: Insertar préstamos
-- Usando valores reales del Excel y fecha del último pago como fecha de préstamo
-- Esto nivela todos los préstamos al día (excepto Laura Macadamia que está en mora)

INSERT INTO loans (clientid, initialcapital, currentcapital, monthlyrate, startdate, isactive)
SELECT 
  c.id,
  -- Capital inicial (valores reales del Excel)
  CASE c.name
    WHEN 'Oscar Barberia' THEN 12975000
    WHEN 'Profesor Hader' THEN 2500000
    WHEN 'Profesora Vicky' THEN 5000000
    WHEN 'Marlion Sinchi' THEN 10000000
    WHEN 'Oscar Entrenador' THEN 8000000
    WHEN 'Elena Diego' THEN 3000000
    WHEN 'Sebastian Runmyprocess' THEN 868787
    WHEN 'Jose Zapata' THEN 8791750
    WHEN 'Felix Killer' THEN 1000000
    WHEN 'David GSE' THEN 1400000
    WHEN 'Leidy Perez Migani' THEN 3000000
    WHEN 'Tio Alejandro' THEN 1000000
    WHEN 'Ángel David salchipapa' THEN 6000000
    WHEN 'Koreano' THEN 4300000
    WHEN 'JHON AIRE' THEN 5000000
    WHEN 'Eulises Hurtado' THEN 3000000
    WHEN 'Mery Sotto' THEN 7500000
    WHEN 'Profesor Eider' THEN 2000000
    WHEN 'Laura Macadamia' THEN 300000
    WHEN 'Sandoval' THEN 7000000
    WHEN 'Juancho primo daniel' THEN 400000
    WHEN 'Alejandra Runmyprocress' THEN 1500000
    WHEN 'Leonel Gym' THEN 1000000
    WHEN 'Ahijado Felipe' THEN 1500000
  END,
  -- Capital actual (igual al inicial)
  CASE c.name
    WHEN 'Oscar Barberia' THEN 12975000
    WHEN 'Profesor Hader' THEN 2500000
    WHEN 'Profesora Vicky' THEN 5000000
    WHEN 'Marlion Sinchi' THEN 10000000
    WHEN 'Oscar Entrenador' THEN 8000000
    WHEN 'Elena Diego' THEN 3000000
    WHEN 'Sebastian Runmyprocess' THEN 868787
    WHEN 'Jose Zapata' THEN 8791750
    WHEN 'Felix Killer' THEN 1000000
    WHEN 'David GSE' THEN 1400000
    WHEN 'Leidy Perez Migani' THEN 3000000
    WHEN 'Tio Alejandro' THEN 1000000
    WHEN 'Ángel David salchipapa' THEN 6000000
    WHEN 'Koreano' THEN 4300000
    WHEN 'JHON AIRE' THEN 5000000
    WHEN 'Eulises Hurtado' THEN 3000000
    WHEN 'Mery Sotto' THEN 7500000
    WHEN 'Profesor Eider' THEN 2000000
    WHEN 'Laura Macadamia' THEN 300000
    WHEN 'Sandoval' THEN 7000000
    WHEN 'Juancho primo daniel' THEN 400000
    WHEN 'Alejandra Runmyprocress' THEN 1500000
    WHEN 'Leonel Gym' THEN 1000000
    WHEN 'Ahijado Felipe' THEN 1500000
  END,
  -- Tasa mensual (%)
  CASE c.name
    WHEN 'Oscar Barberia' THEN 5
    WHEN 'Profesor Hader' THEN 8
    WHEN 'Profesora Vicky' THEN 6
    WHEN 'Marlion Sinchi' THEN 4
    WHEN 'Oscar Entrenador' THEN 6
    WHEN 'Elena Diego' THEN 8
    WHEN 'Sebastian Runmyprocess' THEN 6
    WHEN 'Jose Zapata' THEN 5
    WHEN 'Felix Killer' THEN 8
    WHEN 'David GSE' THEN 7
    WHEN 'Leidy Perez Migani' THEN 10
    WHEN 'Tio Alejandro' THEN 5
    WHEN 'Ángel David salchipapa' THEN 7
    WHEN 'Koreano' THEN 6
    WHEN 'JHON AIRE' THEN 7
    WHEN 'Eulises Hurtado' THEN 10
    WHEN 'Mery Sotto' THEN 6
    WHEN 'Profesor Eider' THEN 10
    WHEN 'Laura Macadamia' THEN 10
    WHEN 'Sandoval' THEN 5
    WHEN 'Juancho primo daniel' THEN 5
    WHEN 'Alejandra Runmyprocress' THEN 7
    WHEN 'Leonel Gym' THEN 6
    WHEN 'Ahijado Felipe' THEN 10
  END,
  -- Fecha de inicio = Mes siguiente al último pago (para nivelar)
  -- Si último pago fue NOVIEMBRE → fecha inicio = DICIEMBRE (2025-12-01)
  -- Si último pago fue DICIEMBRE → fecha inicio = ENERO (2026-01-01)
  -- Si último pago fue OCTUBRE → fecha inicio = NOVIEMBRE (2025-11-01), excepto Laura Macadamia que está en mora
  CASE c.name
    WHEN 'Oscar Barberia' THEN extract(epoch from '2025-12-01'::date)::bigint * 1000  -- PH NOVIEMBRE → Diciembre
    WHEN 'Profesor Hader' THEN extract(epoch from '2025-12-01'::date)::bigint * 1000  -- PH NOVIEMBRE → Diciembre
    WHEN 'Profesora Vicky' THEN extract(epoch from '2025-12-01'::date)::bigint * 1000  -- PH NOVIEMBRE → Diciembre
    WHEN 'Marlion Sinchi' THEN extract(epoch from '2026-01-01'::date)::bigint * 1000  -- PH DICIEMBRE → Enero
    WHEN 'Oscar Entrenador' THEN extract(epoch from '2025-12-01'::date)::bigint * 1000  -- PH NOVIEMBRE → Diciembre
    WHEN 'Elena Diego' THEN extract(epoch from '2025-12-01'::date)::bigint * 1000  -- PH NOVIEMBRE → Diciembre
    WHEN 'Sebastian Runmyprocess' THEN extract(epoch from '2026-01-01'::date)::bigint * 1000  -- PH DICIEMBRE → Enero
    WHEN 'Jose Zapata' THEN extract(epoch from '2025-12-01'::date)::bigint * 1000  -- PH NOVIEMBRE → Diciembre
    WHEN 'Felix Killer' THEN extract(epoch from '2025-12-01'::date)::bigint * 1000  -- PH NOVIEMBRE → Diciembre
    WHEN 'David GSE' THEN extract(epoch from '2025-12-01'::date)::bigint * 1000  -- PH NOVIEMBRE → Diciembre
    WHEN 'Leidy Perez Migani' THEN extract(epoch from '2025-12-01'::date)::bigint * 1000  -- PH NOVIEMBRE → Diciembre
    WHEN 'Tio Alejandro' THEN extract(epoch from '2026-01-01'::date)::bigint * 1000  -- PH DICIEMBRE → Enero
    WHEN 'Ángel David salchipapa' THEN extract(epoch from '2026-01-01'::date)::bigint * 1000  -- PH DICIEMBRE → Enero
    WHEN 'Koreano' THEN extract(epoch from '2026-01-01'::date)::bigint * 1000  -- PH DICIEMBRE → Enero
    WHEN 'JHON AIRE' THEN extract(epoch from '2026-01-01'::date)::bigint * 1000  -- PH DICIEMBRE → Enero
    WHEN 'Eulises Hurtado' THEN extract(epoch from '2025-12-01'::date)::bigint * 1000  -- PH NOVIEMBRE → Diciembre
    WHEN 'Mery Sotto' THEN extract(epoch from '2025-12-01'::date)::bigint * 1000  -- PH NOVIEMBRE → Diciembre
    WHEN 'Profesor Eider' THEN extract(epoch from '2025-12-01'::date)::bigint * 1000  -- PH NOVIEMBRE → Diciembre
    WHEN 'Laura Macadamia' THEN extract(epoch from '2025-11-01'::date)::bigint * 1000  -- PH OCTUBRE → Noviembre (EN MORA - debe noviembre)
    WHEN 'Sandoval' THEN extract(epoch from '2026-01-01'::date)::bigint * 1000  -- PH DICIEMBRE → Enero
    WHEN 'Juancho primo daniel' THEN extract(epoch from '2025-12-01'::date)::bigint * 1000  -- PH NOVIEMBRE → Diciembre
    WHEN 'Alejandra Runmyprocress' THEN extract(epoch from '2025-12-01'::date)::bigint * 1000  -- PH NOVIEMBRE → Diciembre
    WHEN 'Leonel Gym' THEN extract(epoch from '2025-12-01'::date)::bigint * 1000  -- PH NOVIEMBRE → Diciembre
    WHEN 'Ahijado Felipe' THEN extract(epoch from '2025-12-01'::date)::bigint * 1000  -- PH NOVIEMBRE → Diciembre
    ELSE extract(epoch from now())::bigint * 1000
  END,
  true
FROM clients c
WHERE c.name IN (
  'Oscar Barberia', 'Profesor Hader', 'Profesora Vicky', 'Marlion Sinchi',
  'Oscar Entrenador', 'Elena Diego', 'Sebastian Runmyprocess', 'Jose Zapata',
  'Felix Killer', 'David GSE', 'Leidy Perez Migani', 'Tio Alejandro',
  'Ángel David salchipapa', 'Koreano', 'JHON AIRE', 'Eulises Hurtado',
  'Mery Sotto', 'Profesor Eider', 'Laura Macadamia', 'Sandoval',
  'Juancho primo daniel', 'Alejandra Runmyprocress', 'Leonel Gym', 'Ahijado Felipe'
);

  -- PASO 3: Crear transacciones de apertura
  INSERT INTO transactions (loanid, amount, date, description)
  SELECT 
    l.id,
    0,
    l.startdate,
    'APERTURA DE CRÉDITO'
  FROM loans l
  WHERE l.isactive = true
    AND NOT EXISTS (
      SELECT 1 FROM transactions t 
      WHERE t.loanid = l.id AND t.description = 'APERTURA DE CRÉDITO'
    );

