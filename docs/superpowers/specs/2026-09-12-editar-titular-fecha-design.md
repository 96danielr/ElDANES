# Diseño: Editar titular y fecha de inicio desde la tarjeta del préstamo

**Fecha:** 2026-09-12
**Estado:** Implementado a solicitud directa del usuario

## Objetivo

Poder corregir, desde el modal Control Operativo que abre cada tarjeta de Cobros, el nombre de la persona (titular) y la fecha de inicio del préstamo, sin dañar el historial ni los cálculos.

## Decisiones

- El nombre vive donde siempre: `clients.name`. Se edita con el mismo `updateClient` que ya usa el teléfono (escritura directa con RLS `authenticated`). Cambiarlo se refleja en todas las tarjetas y vistas porque todo lee de `clients`.
- La fecha vive en `loans.startdate` (ms epoch). Se edita **solo vía Edge Function `update-loan`**, como toda escritura sobre `loans`.
- Cambiar `startdate` recalcula intereses: el motor (`_shared/finance.ts`) genera interés en cada aniversario mensual contado desde `startdate`. Ese es el efecto deseado (corregir un crédito creado con fecha equivocada). La UI lo avisa cuando la fecha difiere de la original.
- La transacción `APERTURA DE CRÉDITO` lleva la fecha de creación del registro, no `startdate`, y el motor la ignora. **No se toca ninguna transacción.**
- Se cambia la firma `onUpdateLoan(loanId, monthlyrate?, owner?, hasletra?)` por `onUpdateLoan(loanId, patch: LoanPatch)` para dejar de apilar parámetros posicionales. `LoanPatch = Omit<UpdateLoanParams, 'loanId'>`.

## Backend (`supabase/functions/update-loan/index.ts`)

Acepta `startdate` opcional. Validaciones (400 con mensaje en español):

1. Entero finito > 0.
2. No futura (`> Date.now()`).
3. Si cambia respecto a la actual, no puede ser posterior al **primer pago real** del préstamo (`transactions` con `amount > 0`, la más antigua). Evita que el motor aplique pagos antes de que el crédito exista.

Sigue rechazando `currentcapital` / `initialcapital`. Sin SQL nuevo: la columna ya existe. Compatibilidad: la función vieja ignora `startdate` y responde 400 "No se proporcionaron campos" si solo llega ese campo, así que hasta desplegar no se escribe nada erróneo.

## Frontend

- `lib/functions.ts`: `UpdateLoanParams.startdate?: number`; nuevo tipo `LoanPatch`.
- `App.tsx`: `updateLoan(loanId, patch)` reenvía `{ loanId, ...patch }`.
- `views/Dashboard.tsx`:
  - Helper `toUtcDateInput(ms)` → `'YYYY-MM-DD'` en UTC (misma convención que `NewLoan` y el motor).
  - Modo edición (lápiz) agrega **Titular** (texto, mín. 2 caracteres) y **Fecha inicio** (`type="date"`, `max` = hoy). Orden: Titular, Tasa, Fecha inicio, Teléfono.
  - Guardar: arma el `patch` solo con lo que cambió (tasa y/o fecha); llama `onUpdateClient` solo si cambió nombre o teléfono. Botón deshabilitado si nombre < 2, fecha vacía o tasa ≤ 0.
  - La fecha se envía como medianoche UTC del día elegido; si no se toca, no se envía (conserva la hora original del registro).
  - Etiqueta y Letra usan la nueva firma: `{ owner }`, `{ hasletra }`.

## Fuera de alcance

Editar `startdate` de préstamos liquidados, mover fechas de transacciones, ClientsList, PDF.

## Verificación

`npm run build`, `node scripts/test-finance-shared.mjs`, revisión de que la vista de lista y el PDF leen `client.name` desde `clients` (sin copias). Despliegue: `npx supabase functions deploy update-loan --project-ref ougsplrbvypxflyyfojm`.
