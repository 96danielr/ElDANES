# 🚀 Desplegar Edge Functions en Supabase

## 📋 Prerequisitos

1. **Instalar Supabase CLI (Windows):**

   **Opción A - Usando Scoop (Recomendado):**
   ```powershell
   # Instalar Scoop si no lo tienes
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
   
   # Instalar Supabase CLI
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   ```

   **Opción B - Usando Chocolatey:**
   ```powershell
   choco install supabase
   ```

   **Opción C - Descargar binario manualmente:**
   - Ve a: https://github.com/supabase/cli/releases
   - Descarga la última versión para Windows
   - Extrae y agrega a PATH

   **Opción D - Usar npx (sin instalar):**
   ```bash
   # Puedes usar npx en lugar de instalar globalmente
   npx supabase login
   npx supabase link --project-ref ougsplrbvypxflyyfojm
   npx supabase functions deploy settle-loan
   ```

2. **Iniciar sesión en Supabase:**
   ```bash
   supabase login
   # O con npx:
   npx supabase login
   ```

3. **Vincular tu proyecto:**
   ```bash
   supabase link --project-ref ougsplrbvypxflyyfojm
   # O con npx:
   npx supabase link --project-ref ougsplrbvypxflyyfojm
   ```

## 🔧 Configuración

### 1. Inicializar Supabase (si no está inicializado)
```bash
supabase init
```

### 2. Desplegar todas las funciones
```bash
# Desplegar función de liquidación
supabase functions deploy settle-loan
# O con npx:
npx supabase functions deploy settle-loan

# Desplegar función de pagos
supabase functions deploy register-payment
# O con npx:
npx supabase functions deploy register-payment

# Desplegar función de creación de préstamos
supabase functions deploy create-loan
# O con npx:
npx supabase functions deploy create-loan

# Desplegar función de actualización de préstamos
supabase functions deploy update-loan
# O con npx:
npx supabase functions deploy update-loan
```

### 3. Configurar variables de entorno

Las Edge Functions necesitan acceso a las variables de entorno de Supabase. Estas se configuran automáticamente cuando usas `supabase link`, pero puedes verificarlas:

```bash
supabase secrets list
```

Las variables necesarias son:
- `SUPABASE_URL` - Se configura automáticamente
- `SUPABASE_SERVICE_ROLE_KEY` - Se configura automáticamente

## ✅ Verificación

Después de desplegar, verifica que las funciones estén activas:

1. Ve a: https://supabase.com/dashboard/project/ougsplrbvypxflyyfojm/functions
2. Deberías ver las cuatro funciones listadas:
   - `settle-loan`
   - `register-payment`
   - `create-loan`
   - `update-loan`

## 🧪 Probar las funciones

Puedes probar las funciones desde el dashboard de Supabase o desde tu aplicación.

### Desde el Dashboard:
1. Ve a Functions → Selecciona una función
2. Haz clic en "Invoke"
3. Proporciona el JSON de prueba

### Desde la aplicación:
Las funciones ya están integradas en `App.tsx` y se llaman automáticamente cuando:
- Liquidas un préstamo
- Registras un pago
- Creas un nuevo préstamo
- Editas un préstamo (tasa de interés, capital)

## 🔒 Seguridad

Las Edge Functions usan `SUPABASE_SERVICE_ROLE_KEY` que:
- ✅ Bypassa RLS (Row Level Security)
- ✅ Tiene acceso completo a la base de datos
- ✅ Se ejecuta en el servidor (no expone lógica al cliente)

**IMPORTANTE:** Nunca expongas el `SERVICE_ROLE_KEY` en el código del cliente.

## 📝 Notas

- Las funciones se ejecutan en Deno runtime
- Tienen acceso completo a la base de datos
- Manejan CORS automáticamente
- Son atómicas (transacciones seguras)

## 🆘 Troubleshooting

### Error: "Function not found"
- Verifica que la función esté desplegada: `supabase functions list`
- Asegúrate de estar en el proyecto correcto: `supabase projects list`

### Error: "Permission denied"
- Verifica que `SUPABASE_SERVICE_ROLE_KEY` esté configurado
- Revisa que el proyecto esté vinculado: `supabase link`

### Error: "CORS error"
- Las Edge Functions manejan CORS automáticamente
- Si persiste, verifica los headers en el código de la función

