# Diseño: Reskin "Glass Máximo Nu" + endurecimiento de backend

**Fecha:** 2026-06-10
**Estado:** Aprobado por el usuario

## Resumen

Dos frentes en una misma ronda:

1. **Look & feel:** reemplazar el tema actual "Nu Bank light plano" por un glassmorfismo claro de intensidad máxima que conserva la identidad morada Nu (`#8A05BE`).
2. **Backend:** eliminar condiciones de carrera y validaciones faltantes en las Edge Functions, mover el cálculo de interés pendiente al servidor, y mejorar la capa de datos del frontend (realtime dirigido + actualización optimista).

**Restricción dura:** no se modifica el esquema de la base de datos (tablas, columnas, datos). Crear funciones SQL (RPC) en Supabase está permitido explícitamente.

## Decisiones tomadas (con el usuario)

| Decisión | Elección |
|---|---|
| Dirección visual | Glass claro con identidad Nu (no dark, no dual) |
| Intensidad | Máxima: auroras intensas, orbes flotantes, blur fuerte con saturación, glow |
| Alcance backend | Crítico + UX técnica (no incluye refactor de App.tsx en hooks ni mover keys a .env) |
| Atomicidad | RPC de Postgres permitido |

## Sección 1 — Look & Feel "Glass Máximo Nu"

Todo el tema vive en el bloque `<style>` de `index.html` (convención existente del proyecto). Retoques puntuales en TSX solo donde hay estilos Nu inline que rompan el look (p. ej. tarjetas con gradiente `from-accent`).

### Fondo de página
- Base: gradiente lavanda claro (`#F6EEFB → #EAE2F4`, dirección 160°).
- Auroras: 3 gradientes radiales superpuestos — morado `rgba(138,5,190,0.28)` arriba-izquierda, cian `rgba(6,182,212,0.22)` derecha, violeta `rgba(184,69,232,0.20)` abajo-centro.
- Orbes decorativos: 2-3 `div` fijos (`position: fixed`, `pointer-events: none`, `z-index: 0`) con gradiente radial y animación de flotación lenta (~20s) usando solo `transform` y `opacity`. Se montan una vez en `App.tsx` (y en `Login.tsx`).

### Superficies de vidrio
Clases existentes redefinidas (los TSX ya las usan, el reskin es mayormente CSS):

- `.glass-card`, `.metric-card`, `.table-glass`:
  - `background: rgba(255,255,255,0.42)`
  - `backdrop-filter: blur(22px) saturate(1.4)`
  - `border: 1.5px solid rgba(255,255,255,0.85)`
  - `box-shadow: 0 12px 36px rgba(76,29,116,0.16), inset 0 1px 0 rgba(255,255,255,1)` (highlight interior superior)
  - Hover: elevación (`translateY(-2px)`) + sombra más profunda.
- `.nav-glass` (header y bottom-nav móvil): `rgba(255,255,255,0.55)` + `blur(18px)`, borde inferior translúcido.
- `.input-glass`: vidrio translúcido, focus ring morado `0 0 0 3px rgba(138,5,190,0.18)`.
- `.btn-primary`: gradiente `#8A05BE → #B845E8`, glow `0 4px 18px rgba(138,5,190,0.45)`.
- `.btn-secondary` / `.btn-danger`: vidrio con borde tintado.
- `.badge-*`: píldoras translúcidas tintadas (verde/ámbar/rojo/morado) con borde de color al 30%.
- `.modal-overlay`: `rgba(28,16,40,0.35)` + `backdrop-filter: blur(8px)`.
- Variantes de estado de tarjetas (`.glass-green/.glass-yellow/.glass-red`): tinte del borde y sombra según el color de estado del préstamo (se restaura la semántica de color que el tema Nu plano había eliminado).

### Tokens
Se actualizan las variables CSS en `:root` (mismos nombres — sin renombrar nada que los TSX consuman): superficies translúcidas, sombras moradas, tintes. El morado Nu sigue siendo `--accent`.

### Gráficas (Stats.tsx)
Paleta morado/cian con rellenos translúcidos (gradientes con opacidad en `<defs>`), tooltips con fondo de vidrio.

### Login
Mismo tratamiento: orbes + tarjeta de vidrio central.

### Rendimiento y fallbacks
- Móvil (`max-width: 768px`): blur reducido a ~12px.
- `@media (prefers-reduced-motion: reduce)`: orbes estáticos, sin animación de flotación.
- `@supports not (backdrop-filter: blur(1px))`: fondo de tarjeta sólido `rgba(255,255,255,0.92)`.

## Sección 2 — Backend crítico

### 2a. RPC atómicos (`supabase-rpc.sql`, nuevo archivo en la raíz)

Dos funciones Postgres (SECURITY DEFINER, ejecutadas por las Edge Functions vía `supabase.rpc(...)` con service role):

**`register_payment_atomic(p_loan_id, p_amount, p_interest_paid, p_capital_reduction, p_description)`**
1. `SELECT ... FOR UPDATE` sobre el préstamo (bloqueo de fila → elimina la carrera read-modify-write).
2. Valida: préstamo existe y `isactive = true`; `p_amount > 0`; `p_capital_reduction <= currentcapital`.
3. Guard anti-duplicado: rechaza si existe una transacción del mismo préstamo con el mismo monto en los últimos 10 segundos.
4. Inserta la transacción y actualiza `currentcapital` en la misma transacción SQL.
5. Devuelve el préstamo y la transacción resultantes (JSON).

**`settle_loan_atomic(p_loan_id, p_amount, p_description)`**
1. `SELECT ... FOR UPDATE` sobre el préstamo.
2. Valida `isactive = true` — una segunda liquidación concurrente o repetida falla limpiamente (idempotencia natural).
3. Inserta la transacción final, pone `currentcapital = 0` e `isactive = false`, todo atómico.
4. Devuelve préstamo y transacción.

El usuario ejecuta el archivo una vez en el SQL Editor de Supabase. No crea ni altera tablas, columnas ni datos.

### 2b. Cálculo de interés en el servidor

- Nuevo `supabase/functions/_shared/finance.ts`: port del núcleo de `utils/finance.ts` (`calculateLoanSummary` y dependencias) a un módulo Deno-compatible.
- `register-payment`: ignora el `pendingInterest` enviado por el cliente; recalcula server-side a partir del préstamo + sus transacciones, hace el split interés/capital en el servidor y llama al RPC.
- `settle-loan`: recalcula el total a liquidar (capital + interés pendiente) server-side; rechaza con 409 si el monto enviado por el cliente difiere materialmente (> $1 de tolerancia por redondeo), devolviendo el valor correcto para que el frontend refresque.
- **Paridad garantizada:** script `scripts/verify-finance-parity.mjs` que ejecuta ambos cálculos (frontend y `_shared`) sobre casos representativos (incluyendo inyecciones de capital y aniversarios fin de mes) y falla si divergen.

### 2c. Validaciones de entrada (las 4 Edge Functions)

- `create-loan`: `capital > 0`, `rate > 0`; si `existingLoanId` viene, verificar que pertenece a `clientId` (hoy se puede inyectar capital al préstamo de otro cliente).
- `register-payment`: `amount > 0`.
- `settle-loan`: `amount > 0`.
- `update-loan`: `rate > 0` cuando se edita (mantiene el rechazo existente de edición de capital).
- Errores de validación → HTTP 400 con mensaje claro; no encontrado → 404; lo demás → 500.

### 2d. Limpieza incidental
- `supabase/functions/_shared/cors.ts`: headers CORS compartidos (hoy duplicados en las 4 funciones).

### Contrato de respuesta de Edge Functions
`register-payment` y `settle-loan` devuelven `{ success, loan, transaction }` con el estado final — insumo para la actualización optimista (Sección 3).

## Sección 3 — UX técnica (capa de datos en App.tsx)

### Realtime dirigido
- El handler del canal deja de llamar `fetchData()` global. Usa el payload del evento (`eventType`, `new`, `old`, `table`) para mutar solo el slice afectado: INSERT → agregar, UPDATE → reemplazar por id, DELETE → quitar por id.
- Refetch completo solo en reconexión del canal (estado `SUBSCRIBED` tras una caída) y en el mount inicial.

### Actualización optimista
- `registerPayment` / `settleLoan` / `createLoan` en `App.tsx` aplican el `loan`/`transaction` devueltos por la Edge Function directamente al estado al resolver — la UI refleja el resultado sin esperar refetch ni evento realtime (el evento realtime posterior es un no-op porque el reemplazo por id es idempotente).

## Fuera de alcance (explícito)

- Cambios de esquema o datos en la base de datos.
- Refactor de `App.tsx` en hooks/contextos.
- Mover la anon key de Supabase a `.env`.
- Parámetro `owner` en `create-loan`.
- Supabase Auth (se mantiene el gate de contraseña local).
- Reestilizado del PDF (`utils/reportPdf.ts`).

## Verificación

1. `npm run build` sin errores.
2. `node scripts/verify-finance-parity.mjs` — paridad frontend/servidor del cálculo de interés.
3. Flujos manuales con `npm run dev`: login, crear cliente + préstamo, registrar pago (interés/capital/mixto), liquidar, ver Stats y Movimientos — verificando el look en desktop y móvil (DevTools).
4. Deploy: `supabase functions deploy <fn> --project-ref ougsplrbvypxflyyfojm` para las 4 funciones + ejecutar `supabase-rpc.sql` en el SQL Editor (paso manual del usuario).
5. Prueba de concurrencia básica: dos pagos simultáneos al mismo préstamo (script o doble clic) → uno aplica, el otro recibe el rechazo del guard.

## Riesgos

- **Port de finance.ts a Deno:** divergencia de cálculo → mitigado por el script de paridad (gate obligatorio antes de deploy).
- **Blur intenso en móviles de gama baja:** mitigado por la media query que reduce el blur y `prefers-reduced-motion`.
- **RLS y RPC:** las funciones RPC son SECURITY DEFINER y solo se llaman desde Edge Functions con service role; no se exponen a `anon` (REVOKE EXECUTE FROM anon, authenticated).
