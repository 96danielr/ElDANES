# 🔐 Configuración de Políticas de Seguridad en Supabase

## 📋 Pasos para Configurar las Políticas

### 1. Accede a tu Proyecto Supabase
- Ve a: https://supabase.com/dashboard
- Inicia sesión con tu cuenta
- Selecciona tu proyecto: `ougsplrbvypxflyyfojm`

### 2. Abre el SQL Editor
- En el menú lateral izquierdo, busca y haz clic en **"SQL Editor"**
- O ve directamente a: https://supabase.com/dashboard/project/ougsplrbvypxflyyfojm/sql/new

### 3. Ejecuta el Script
- Abre el archivo `supabase-policies.sql` en este proyecto
- **Copia TODO el contenido** del archivo
- Pégalo en el SQL Editor de Supabase
- Haz clic en el botón **"Run"** (o presiona `Ctrl+Enter` / `Cmd+Enter`)

### 4. Verifica que Funcionó
Deberías ver un mensaje de éxito indicando que las políticas se crearon correctamente.

---

## ✅ ¿Qué hace este script?

Este script crea políticas de seguridad (RLS - Row Level Security) que permiten:
- ✅ **SELECT**: Leer datos de todas las tablas
- ✅ **INSERT**: Crear nuevos registros
- ✅ **UPDATE**: Actualizar registros existentes
- ✅ **DELETE**: Eliminar registros

Para las siguientes tablas:
- `clients` (Clientes)
- `loans` (Préstamos)
- `transactions` (Transacciones)

---

## 🔍 Verificar las Políticas

Si quieres verificar que las políticas se crearon correctamente, ejecuta este SQL:

```sql
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
```

---

## ⚠️ Nota de Seguridad

Estas políticas permiten **acceso completo** a las tablas para usuarios anónimos (`anon`). 
Esto es adecuado para aplicaciones internas o de desarrollo.

Para producción, considera restringir el acceso según tus necesidades de seguridad.

---

## 🆘 Si algo sale mal

1. **Error: "policy already exists"**
   - El script ya elimina políticas existentes, pero si persiste el error, ejecuta primero:
   ```sql
   DROP POLICY IF EXISTS "Allow select clients" ON clients;
   DROP POLICY IF EXISTS "Allow insert clients" ON clients;
   DROP POLICY IF EXISTS "Allow update clients" ON clients;
   DROP POLICY IF EXISTS "Allow delete clients" ON clients;
   -- Repite para loans y transactions
   ```

2. **Error: "permission denied"**
   - Asegúrate de estar usando la cuenta de administrador del proyecto
   - Verifica que RLS esté habilitado en las tablas

3. **Las operaciones aún no funcionan**
   - Verifica que RLS esté habilitado: Ve a Table Editor → Selecciona la tabla → Settings → Row Level Security debe estar ON
   - Recarga la aplicación en el navegador

