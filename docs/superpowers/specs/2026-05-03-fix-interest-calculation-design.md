# Fix de cálculo de intereses + bloqueo de operaciones que dañan la BD

**Fecha:** 2026-05-03
**Estado:** Diseño aprobado, listo para implementación

## Problema

La aplicación reporta como "verde / sin deuda" préstamos que sí tienen intereses pendientes. Hoy (2026-05-03) la simulación detecta **$5,769,560 de interés no cobrado en 17 préstamos** que el Dashboard muestra al día.

Causas raíz en `utils/finance.ts:23-95` (`calculateLoanSummary`):

1. **`totalPaid` suma TODAS las transacciones sin distinguir por tipo.** Los `Abono a Capital` se restan de los intereses generados como si los pagaran. Cualquier abono a capital crea un "saldo a favor" ficticio que oculta la deuda.

2. **`totalInterestGenerated` usa el `currentcapital` actual para todos los meses pasados.** Si el capital era mayor en meses anteriores (lo más común — los abonos lo bajan), se subestiman los intereses históricos generados.

Ambos bugs se cancelan parcialmente entre sí, lo que oculta el problema visualmente.

Causa secundaria: la Edge Function `update-loan` permite que el frontend modifique `currentcapital` y `initialcapital` arbitrariamente sin registrar transacción. El botón "Editar" del modal del Dashboard hace exactamente eso. Esto produjo divergencias en 12 préstamos entre el `currentcapital` de BD y lo que reconstruye la simulación desde el historial de transacciones.

## Decisiones de diseño

- **Capital actual mostrado:** se mantiene `loans.currentcapital` de BD como fuente de verdad. Se sigue usando para el siguiente pago (`register-payment` ya lo usa).
- **Cálculo de intereses:** se reemplaza la lógica de `calculateLoanSummary` por una simulación cronológica de transacciones. La simulación se "ancla" al `currentcapital` de BD cuando hay divergencia.
- **Bloqueo de UI:** se elimina la edición directa de capital en el modal del Dashboard. El usuario solo podrá modificar `monthlyrate` y `owner`. Para cambiar el capital, debe usar los flujos legítimos (Abono a Capital, Inyección de Capital).

## Algoritmo (nueva `calculateLoanSummary`)

```text
input: loan, transactions[]
constants: rate = loan.monthlyrate / 100

# 1. Filtrar y ordenar txs ascendente por fecha
txs = transactions filtrados por loan.id, ordenados por date asc

# 2. Inicializar simulación
running_capital = loan.initialcapital
interest_owed   = 0
interest_paid   = 0
next_anniversary = startdate + 1 mes (preservando día del mes)

# 3. Iterar transacciones cronológicamente
for tx in txs:
    # Generar intereses para todos los aniversarios <= tx.date
    while next_anniversary <= tx.date:
        interest_owed += running_capital * rate
        next_anniversary = next_anniversary + 1 mes

    # Aplicar tx según description
    desc_upper = tx.description.toUpperCase()

    if desc_upper.contains("APERTURA"):
        continue  # nada que hacer

    if desc_upper.contains("INYECCI"):
        # Parsear monto del description: "INYECCIÓN CAPITAL (+2000000)"
        match = regex /\+(\d+)/ on tx.description
        if match: running_capital += parseFloat(match[1])
        continue

    if tx.amount == 0:
        continue

    if tx.description == "Pago Intereses":
        interest_paid += tx.amount
    elif tx.description == "Abono a Capital":
        running_capital -= tx.amount
    elif tx.description.contains("Mixto") OR tx.description == "Pago Intereses + capital":
        pending = max(0, interest_owed - interest_paid)
        to_interest = min(tx.amount, pending)
        to_capital  = tx.amount - to_interest
        interest_paid   += to_interest
        running_capital -= to_capital
    else:
        # Description desconocida — log warning, ignorar
        continue

# 4. Reconciliar con BD: la BD es la fuente de verdad para el capital actual
delta = loan.currentcapital - running_capital
if abs(delta) > 0.01:
    # Asumir que el delta ocurrió justo después del último tx
    # (representa una edición silenciosa del pasado que no se puede ubicar en el tiempo)
    running_capital = loan.currentcapital

# 5. Generar intereses pendientes desde el último tx hasta hoy con el capital reconciliado
while next_anniversary <= today:
    interest_owed += running_capital * rate
    next_anniversary = next_anniversary + 1 mes

# 6. Resultados
pending_interest        = max(0, interest_owed - interest_paid)
monthly_interest_amount = running_capital * rate  # interés del próximo mes
debt_months             = pending_interest / monthly_interest_amount  if monthly_interest_amount > 0 else 0
months_passed           = getGeneratedPeriods(loan.startdate)  # sin cambios

# Color: igual que hoy (verde < 1, amarillo 1-2, rojo >= 2)
status_color = ...

# last_payment: igual que hoy (mayor fecha de tx con amount > 0)
```

### Manejo del día de aniversario

Se mantiene la lógica existente de `getGeneratedPeriods` (`utils/finance.ts:4-21`): el aniversario es el día del mes del `startdate`. Para meses cortos (ej. inicio el 31 → febrero), se acepta el comportamiento estándar de `Date.setMonth()` de JavaScript que hace overflow al primer día del mes siguiente — ya está validado en producción.

### Descripciones soportadas (catálogo cerrado)

Estas son las únicas 6 descripciones que aparecen en BD a hoy:

| Description | Frecuencia | Tratamiento |
|---|---:|---|
| `Pago Intereses` | 70 | Suma a `interest_paid` |
| `APERTURA DE CRÉDITO` | 34 | Ignorar (amount=0) |
| `Abono Mixto (Int + Cap)` | 17 | Mixto: cubrir interés primero, sobrante a capital |
| `Abono a Capital` | 9 | Resta de `running_capital` |
| `INYECCIÓN CAPITAL (+N)` | 1 | Parsear `+N` del string, sumar a `running_capital` |
| `Pago Intereses + capital` | 1 | Tratar como Mixto (legacy) |

Cualquier descripción nueva no listada se ignora con un `console.warn`.

## Cambios en UI

**`views/Dashboard.tsx`** (modal de edición de préstamo, líneas ~530-568):

- Eliminar el input "Capital" del modo edición.
- Dejar solo el input "Tasa %".
- El handler `onUpdateLoan` se llama solo con `monthlyrate`. No se pasa `currentcapital` ni `initialcapital`.
- El display read-only del capital (líneas 571-580) se mantiene como está.

Es decir: el botón "Editar" pasa a editar solo la tasa. El capital únicamente se modifica vía:
- "Abono a Capital" desde el modal de pago (reduce capital, registra tx).
- "Inyección de capital" desde la vista NewLoan (aumenta capital, registra tx).

**`supabase/functions/update-loan/index.ts`**:

- Rechazar la llamada con error 400 si el body incluye `currentcapital` o `initialcapital`. Permitir solo `monthlyrate` y `owner`.
- Esto previene que cualquier cliente (incluido el frontend desplegado en producción contra una versión vieja del código) pueda llegar a modificar el capital silenciosamente.

**`lib/functions.ts`** (`UpdateLoanParams` interface):

- Quitar `currentcapital` e `initialcapital` del tipo `UpdateLoanParams`. Solo dejar `monthlyrate` y `owner`. Esto bloquea el path en TypeScript también.

**`App.tsx`** (función `updateLoan` envoltura):

- Cambiar firma a `updateLoan(loanId, monthlyrate?, owner?)`. Eliminar parámetros `currentcapital` e `initialcapital`.

## Tipos (`types.ts`)

`LoanSummary` no necesita campos nuevos. Los existentes (`pendingInterest`, `monthlyInterestAmount`, `totalInterestGenerated`, `totalInterestPaid`, `monthsPassed`, `debtMonths`, `statusColor`, `lastPaymentDate`, `lastPaymentMonth`) se mantienen, solo cambian sus valores.

## Verificación

No hay framework de tests configurado. La verificación se hace de tres formas:

1. **Script de simulación** (ya existe en `.claude/simulate.py`). Antes y después del fix, correr y comparar resultados. Después del fix, los números del frontend deben coincidir con los del script.

2. **Verificación manual contra Dashboard tras `npm run dev`**:
   - Oscar Entrenador: debe pasar de verde → amarillo $240,000.
   - Jose Zapata: debe pasar de verde → rojo, ~$1,096,136.
   - Felipe Néstor (con la inyección procesada): rojo, ~$1,244,000.
   - Préstamos sin abonos a capital pero con pagos al día deben seguir verdes.

3. **Casos edge a verificar**:
   - Préstamo nuevo sin transacciones → genera intereses sobre `initialcapital`. OK.
   - Préstamo con startdate en el futuro → `monthsPassed = 0`, `interest_owed = 0`. OK.
   - Préstamo con descripción desconocida → `console.warn` y se ignora la tx. OK.
   - Préstamo con divergencia BD vs sim → la sim "snapea" al `currentcapital` de BD para el cálculo del mes actual. OK.

## Datos existentes

No se hace migración ni backfill. Las divergencias actuales entre BD y simulación quedan reconocidas y documentadas. La estrategia de anclaje (paso 4 del algoritmo) garantiza que el cálculo del mes actual sea correcto independientemente de la divergencia histórica. La lista de divergencias documentada el 2026-05-03 puede revisarse manualmente por el usuario a posteriori si lo desea.

## Out of scope

Se descartan explícitamente para este fix:

- Persistir el desglose `interest_amount`/`capital_amount` en la tabla `transactions` (Opción B descartada en la fase de diseño).
- Crear tabla `interest_periods` (Opción C descartada).
- Backfill de transacciones para corregir divergencias históricas (riesgo de cambiar la verdad operativa actual).
- Badge/aviso visual en la UI para préstamos con divergencia (descartado por el usuario; lista de divergencias ya entregada como reporte único).
- Auditoría de cambios via `update-loan` (no se logueará histórico de cambios de tasa por ahora; si el usuario lo quiere después, es otro spec).
- Cambiar la representación de inyecciones (no se persiste en columna numérica, se sigue usando el formato actual `INYECCIÓN CAPITAL (+N)`).

## Riesgos

- **Cambio en números visibles**: post-fix, varios préstamos pasarán de verde a amarillo/rojo. Esperado y deseado, pero el usuario debe estar consciente al desplegar.
- **Performance**: la simulación corre por cada préstamo en cada `useMemo` del Dashboard. Con 34 préstamos activos y un puñado de transacciones cada uno, el costo es despreciable (<1ms total).
- **Sincronización Edge Function ↔ frontend**: la Edge Function `register-payment` calcula `pendingInterest` con la versión vieja (recibida del frontend) hasta que se redeploy el frontend. Esto NO es un riesgo nuevo — la Edge Function hoy ya recibe `pendingInterest` precalculado del cliente. Después del fix, lo que recibe es el cálculo correcto.
