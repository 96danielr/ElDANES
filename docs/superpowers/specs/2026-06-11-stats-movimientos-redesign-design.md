# Diseño: Rediseño de Stats y Movimientos

**Fecha:** 2026-06-11
**Estado:** Aprobado por el usuario

## Problema

Solo se usa la vista Cobros. Stats está llena de métricas de relleno y una "Proyección 12 meses" ficticia (multiplicación lineal del rédito). Movimientos solo muestra entradas (`amount > 0`), nunca muestra préstamos otorgados ni inyecciones (se registran con monto 0), y busca el cliente solo entre préstamos activos — los pagos de préstamos liquidados aparecen como "Desconocido".

## Decisiones con el usuario

- Stats debe responder dos preguntas: **¿cuánto ganamos realmente?** y **¿cómo va la cobranza del mes?** (no se priorizó reparto por socio ni análisis de riesgo).
- Movimientos pasa a ser **flujo de caja completo**: entradas y salidas con neto mensual.
- Cobros, Clientes y Operar no se tocan.

## Núcleo financiero: `computePaymentBreakdown`

Nueva función en `supabase/functions/_shared/finance.ts` (con tests en `scripts/test-finance-shared.mjs`):

```ts
computePaymentBreakdown(loan, transactions): PaymentSplit[]
// PaymentSplit: { txId, date, amount, toInterest, toCapital, kind, injectedAmount? }
// kind: 'apertura' | 'inyeccion' | 'interes' | 'capital' | 'mixto' | 'liquidacion' | 'otro'
```

Recorre las transacciones con la misma simulación cronológica que `computeInterestState` y descompone cada pago en parte interés / parte capital:
- `Pago Intereses` → todo a interés. `Abono a Capital` → todo a capital. `Mixto` → interés pendiente primero, resto a capital.
- `PAGO DE LIQUIDACIÓN TOTAL` → se descompone como mixto (interés pendiente al momento de liquidar + resto capital). Solo para el desglose: `computeInterestState` no cambia.
- `INYECCIÓN` → kind `inyeccion` con `injectedAmount` parseado de la descripción.
- `APERTURA` → kind `apertura` (el monto de salida lo aporta la vista con `loan.initialcapital`).

## Movimientos → Flujo de caja

Props nuevas: `{ transactions, loans, clients }` (deja de depender de `summaries`; el cliente se resuelve vía `loan.clientid` contra TODOS los préstamos → fin de los "Desconocido").

- **Entradas (verde):** pagos con chip de tipo (Interés / Capital / Mixto / Liquidación).
- **Salidas (rojo):** aperturas (monto = `initialcapital` del préstamo) e inyecciones (monto parseado).
- **Cabecera mensual:** Entró / Salió / Neto en grande, + contador de movimientos.
- Selector de los últimos 6 meses (igual que hoy).
- Limitación documentada: en los ~3 préstamos viejos cuyo `initialcapital` quedó inflado por inyecciones antiguas, el monto de la apertura sale sobreestimado (datos históricos con semántica mixta). Exacto para todo lo nuevo.

## Stats → dos bloques

Props: se agrega `clients` (para nombres de préstamos liquidados).

**Bloque 1 — Ganancia real** (interés efectivamente cobrado, vía `computePaymentBreakdown` sobre todos los préstamos, activos y liquidados):
- Cards: ganancia este mes, mes anterior, acumulado del año (desde 1 enero), histórico total.
- Gráfica de barras: interés cobrado por mes, últimos 6 meses.

**Bloque 2 — Cobranza del mes** (solo préstamos activos):
- Esperado del mes = suma de `monthlyInterestAmount`; Cobrado (interés) del mes; barra de progreso %.
- Lista de clientes ordenada: ✗ falta primero, ◐ parcial, ✓ pagó — con monto esperado y cobrado de cada uno.
  - ✓ pagó: interés cobrado del mes ≥ 98% del mensual. ◐ parcial: > 0. ✗ falta: 0.
- Fila de contexto compacta: Capital en Calle, Interés Pendiente total, Activos / En mora.

**Se elimina:** proyección 12 meses, pies de estado, las 12 metric-cards de relleno, resúmenes duplicados.

## Fuera de alcance

Cobros, Clientes, Operar, backend, esquema de BD.

## Verificación

`node scripts/test-finance-shared.mjs` (tests nuevos del breakdown) + `npm run build` + verificación visual con dev server (screenshots headless) de ambas vistas con datos reales.
