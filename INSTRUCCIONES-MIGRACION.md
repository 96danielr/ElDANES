# 📊 Migrar Datos de Excel a Supabase

## 📋 Pasos para Migrar

### 1. Preparar los Datos

He creado dos scripts SQL basados en tu Excel:

- **`migrate-excel-data.sql`** - Script completo con todos los datos
- **`migrate-excel-data-simple.sql`** - Versión simplificada (más fácil de editar)

### 2. Ejecutar el Script

1. **Ve al SQL Editor de Supabase:**
   - https://supabase.com/dashboard/project/ougsplrbvypxflyyfojm/sql/new

2. **Abre el archivo `migrate-excel-data-simple.sql`**

3. **Revisa y ajusta los datos:**
   - Verifica que los nombres coincidan exactamente
   - Ajusta capitales si hay diferencias
   - Verifica las fechas de inicio
   - Ajusta las tasas de interés si es necesario

4. **Copia y pega el script completo**

5. **Ejecuta (Run o Ctrl+Enter)**

### 3. Verificar la Migración

Después de ejecutar, verifica con estas consultas:

```sql
-- Ver cuántos clientes se insertaron
SELECT COUNT(*) as total_clientes FROM clients;

-- Ver cuántos préstamos activos hay
SELECT COUNT(*) as total_prestamos FROM loans WHERE isactive = true;

-- Ver préstamos con sus clientes
SELECT 
  c.name as cliente,
  l.initialcapital as capital,
  l.monthlyrate as tasa,
  to_timestamp(l.startdate / 1000) as fecha_inicio
FROM loans l
JOIN clients c ON l.clientid = c.id
WHERE l.isactive = true
ORDER BY c.name;
```

## 🔧 Ajustar Datos Manualmente

Si necesitas ajustar algún dato después de la migración:

### Cambiar capital de un préstamo:
```sql
UPDATE loans 
SET currentcapital = 1500000, initialcapital = 1500000
WHERE id = (SELECT l.id FROM loans l JOIN clients c ON l.clientid = c.id WHERE c.name = 'Nombre Cliente');
```

### Cambiar tasa de interés:
```sql
UPDATE loans 
SET monthlyrate = 8
WHERE id = (SELECT l.id FROM loans l JOIN clients c ON l.clientid = c.id WHERE c.name = 'Nombre Cliente');
```

### Agregar teléfono a un cliente:
```sql
UPDATE clients 
SET phone = '1234567890'
WHERE name = 'Nombre Cliente';
```

## 📝 Notas Importantes

1. **Nombres deben coincidir exactamente** - Los nombres en el script deben coincidir exactamente con los de tu Excel

2. **Capitales sin puntos ni comas** - Los números deben estar sin formato (ej: 12975000, no 12.975.000)

3. **Fechas en formato YYYY-MM-DD** - Las fechas están en formato ISO (ej: '2025-01-01')

4. **Tasas en porcentaje** - Las tasas están como números (5 = 5%, 10 = 10%)

5. **Transacciones de apertura** - Se crean automáticamente para cada préstamo

## 🆘 Si algo sale mal

### Error: "duplicate key value"
- Los clientes o préstamos ya existen
- Puedes usar `ON CONFLICT DO NOTHING` o eliminar datos existentes primero

### Error: "foreign key constraint"
- Los clientes no se insertaron correctamente
- Ejecuta primero la parte de INSERT INTO clients

### Datos incorrectos
- Puedes eliminar y volver a insertar:
```sql
-- CUIDADO: Esto elimina todos los datos
DELETE FROM transactions;
DELETE FROM loans;
DELETE FROM clients;
```

## ✅ Después de la Migración

Una vez migrados los datos:

1. **Recarga tu aplicación** - Los datos deberían aparecer automáticamente
2. **Verifica en el Dashboard** - Deberías ver todos los préstamos activos
3. **Prueba las operaciones** - Liquidar, pagar, etc.

