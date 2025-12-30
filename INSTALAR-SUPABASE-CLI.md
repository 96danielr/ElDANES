# 🛠️ Instalar Supabase CLI en Windows

## ❌ Problema

No puedes instalar Supabase CLI con `npm install -g supabase` porque no está soportado.

## ✅ Soluciones

### Opción 1: Usar npx (Más Fácil - Sin Instalar)

Puedes usar `npx` para ejecutar Supabase CLI sin instalarlo:

```bash
# Iniciar sesión
npx supabase login

# Vincular proyecto
npx supabase link --project-ref ougsplrbvypxflyyfojm

# Desplegar funciones
npx supabase functions deploy settle-loan
npx supabase functions deploy register-payment
npx supabase functions deploy create-loan
```

**Ventaja:** No necesitas instalar nada, solo usar `npx`.

---

### Opción 2: Instalar con Scoop (Recomendado para Windows)

1. **Instalar Scoop (si no lo tienes):**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
   ```

2. **Agregar bucket de Supabase:**
   ```powershell
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   ```

3. **Instalar Supabase CLI:**
   ```powershell
   scoop install supabase
   ```

4. **Verificar instalación:**
   ```bash
   supabase --version
   ```

---

### Opción 3: Instalar con Chocolatey

Si tienes Chocolatey instalado:

```powershell
choco install supabase
```

---

### Opción 4: Descargar Binario Manualmente

1. Ve a: https://github.com/supabase/cli/releases
2. Descarga la última versión para Windows (`.exe`)
3. Extrae el archivo
4. Agrega la carpeta a tu PATH de Windows
5. O coloca el `.exe` en una carpeta que ya esté en tu PATH

---

## 🚀 Después de Instalar

Una vez que tengas Supabase CLI instalado (o uses npx), sigue estos pasos:

```bash
# 1. Iniciar sesión
supabase login
# O: npx supabase login

# 2. Vincular tu proyecto
supabase link --project-ref ougsplrbvypxflyyfojm
# O: npx supabase link --project-ref ougsplrbvypxflyyfojm

# 3. Desplegar funciones
supabase functions deploy settle-loan
supabase functions deploy register-payment
supabase functions deploy create-loan
```

---

## 💡 Recomendación

**Para empezar rápido:** Usa `npx` (Opción 1) - no necesitas instalar nada.

**Para uso a largo plazo:** Instala con Scoop (Opción 2) - es más rápido y conveniente.

