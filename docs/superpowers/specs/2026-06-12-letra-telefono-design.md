# Diseño: Letra firmada + teléfono visible/editable en préstamos

**Fecha:** 2026-06-12
**Estado:** Aprobado por el usuario

## Objetivo

Saber de un vistazo si un préstamo está respaldado por letra firmada, y ver/editar el teléfono del cliente desde la tarjeta de Cobros. Editable también al crear el préstamo.

## Decisiones

- `hasletra` es booleano. **Todos los préstamos existentes quedan en `false`** ("no tiene letra"); Daniel y su socio los van marcando desde la interfaz.
- El teléfono vive donde siempre: `clients.phone`. Solo se expone y edita desde la tarjeta/modal del préstamo.

## Base de datos

Nuevo archivo `supabase-add-letra.sql` (el usuario lo ejecuta una vez en el SQL Editor):

```sql
alter table loans add column if not exists hasletra boolean not null default false;
```

Columna nueva con default — ningún cálculo ni código existente la lee, riesgo cero.

## Backend

- `create-loan`: acepta `hasLetra` opcional; inserta `hasletra: Boolean(hasLetra)`.
- `update-loan`: acepta `hasletra` opcional; valida que sea booleano (400 si no); lo agrega a `updateData`.
- `lib/functions.ts`: `CreateLoanParams.hasLetra?: boolean`, `UpdateLoanParams.hasletra?: boolean`.

## Frontend

- `types.ts`: `Loan.hasletra?: boolean` (opcional por compatibilidad mientras se corre el SQL).
- `App.tsx`: `updateLoan(loanId, monthlyrate?, owner?, hasletra?)`; pasa `onUpdateClient={updateClient}` a Dashboard; `createLoan` acepta y reenvía `hasLetra`.
- `NewLoan.tsx`: selector "¿Tiene letra firmada?" **No / Sí** (default No) entre la fecha y la simulación; se envía en `onCreateLoan`.
- `Dashboard.tsx`:
  - **Tarjeta (grid):** junto al badge de owner, chip `Letra ✓` (tinte verde) o `Sin letra` (gris). Debajo, si el cliente tiene teléfono: icono + número como `<a href="tel:...">` con `stopPropagation` (no abre el modal al tocarlo).
  - **Modal Control Operativo:**
    - Sección "Letra" idéntica en patrón a "Etiqueta": botones **Sí / No** con actualización instantánea (`onUpdateLoan(id, undefined, undefined, value)` + actualización local de `selectedLoan`).
    - Modo edición (lápiz): junto al campo Tasa se agrega campo **Teléfono**; Guardar llama `onUpdateLoan` (tasa) y `onUpdateClient(clientId, name, phone)` si el teléfono cambió.

## Fuera de alcance

Vista de lista del Dashboard, ClientsList, PDF, préstamos liquidados.

## Verificación

`npm run build`, captura headless de la tarjeta y el modal con datos reales, prueba de extremo a extremo: marcar letra en un préstamo y editar un teléfono (verificando que el realtime/optimista refresca), deploy de `create-loan` y `update-loan`.
