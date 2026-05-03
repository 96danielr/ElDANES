# Fix de cálculo de intereses + bloqueo de operaciones que dañan la BD

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir `calculateLoanSummary` para que descuente correctamente solo los pagos a interés y use el capital histórico al calcular intereses generados; bloquear desde la UI y la Edge Function la modificación directa de `currentcapital`/`initialcapital` que produce divergencias de datos.

**Architecture:** Una sola función pura (`calculateLoanSummary` en `utils/finance.ts`) reemplaza la fórmula buggy por una simulación cronológica que itera el historial de transacciones del préstamo, distinguiendo cada tipo (`Pago Intereses`, `Abono a Capital`, `Abono Mixto`, `INYECCIÓN CAPITAL`, `APERTURA`). Al final ancla el `running_capital` simulado al `loans.currentcapital` de BD para que el cálculo del mes en curso refleje el capital operativo real. UI y Edge Function pasan a aceptar solo edición de `monthlyrate` y `owner`.

**Tech Stack:** TypeScript, React 19, Vite 6, Supabase Edge Functions (Deno).

**Spec:** [docs/superpowers/specs/2026-05-03-fix-interest-calculation-design.md](../specs/2026-05-03-fix-interest-calculation-design.md)

---

### Task 1: Reescribir `calculateLoanSummary` con simulación cronológica

**Files:**
- Modify: `utils/finance.ts` (reemplazo total de la función `calculateLoanSummary`, líneas 23-95)

- [ ] **Step 1: Hacer backup mental de los outputs de referencia (simulate.py)**

Correr el script de simulación de referencia para tener los números esperados a la mano antes del cambio. No es un test automatizado pero es nuestro oráculo.

```bash
python3 .claude/simulate.py | head -40
```

Anotar mentalmente los resultados clave:
- Oscar Entrenador: pending = $240,000
- Jose Zapata: pending ≈ $1,123,090 (con anclaje a BD = $7M, May = $350K)
- Felipe Néstor: pending ≈ $1,244,000
- Préstamos al día (Leonel Gym, Octavio, etc.): pending = 0

(El script aún no aplica anclaje BD; eso lo hace la nueva `calculateLoanSummary`. Para Jose Zapata el script da $1,096,136 — la diferencia con $1,123,090 es porque la nueva implementación TS ancla al cap de BD antes de generar el último aniversario.)

- [ ] **Step 2: Reemplazar `calculateLoanSummary` y agregar helper `addMonth`**

Editar [utils/finance.ts](utils/finance.ts) y reemplazar todo el contenido del archivo por:

```ts
import { Loan, Transaction, LoanSummary, Client } from '../types';

export const getGeneratedPeriods = (start: number): number => {
  const startDate = new Date(Number(start));
  const now = new Date();

  let months = (now.getFullYear() - startDate.getFullYear()) * 12;
  months += now.getMonth() - startDate.getMonth();

  if (now.getDate() < startDate.getDate()) {
    months -= 1;
  }

  return Math.max(0, months);
};

const addMonth = (d: Date): Date => {
  const next = new Date(d);
  next.setMonth(next.getMonth() + 1);
  return next;
};

export const calculateLoanSummary = (
  loan: Loan,
  client: Client,
  transactions: Transaction[]
): LoanSummary => {
  const rate = Number(loan.monthlyrate || 0) / 100;
  const startDate = new Date(Number(loan.startdate));
  const today = new Date();

  const txs = transactions
    .filter((t) => t.loanid === loan.id)
    .sort((a, b) => Number(a.date) - Number(b.date));

  let runningCapital = Number(loan.initialcapital || 0);
  let interestOwed = 0;
  let interestPaid = 0;
  let nextAnniversary = addMonth(startDate);

  const generateInterestUntil = (cutoff: Date) => {
    while (nextAnniversary <= cutoff) {
      interestOwed += runningCapital * rate;
      nextAnniversary = addMonth(nextAnniversary);
    }
  };

  for (const tx of txs) {
    const txDate = new Date(Number(tx.date));
    generateInterestUntil(txDate);

    const desc = (tx.description || '').trim();
    const amount = Number(tx.amount || 0);
    const descUpper = desc.toUpperCase();

    if (descUpper.includes('APERTURA')) continue;

    if (descUpper.includes('INYECCI')) {
      const match = desc.match(/\+(\d+)/);
      if (match) {
        runningCapital += Number(match[1]);
      }
      continue;
    }

    if (amount === 0) continue;

    if (desc === 'Pago Intereses') {
      interestPaid += amount;
    } else if (desc === 'Abono a Capital') {
      runningCapital -= amount;
    } else if (desc.includes('Mixto') || desc === 'Pago Intereses + capital') {
      const pending = Math.max(0, interestOwed - interestPaid);
      const toInterest = Math.min(amount, pending);
      const toCapital = amount - toInterest;
      interestPaid += toInterest;
      runningCapital -= toCapital;
    } else {
      console.warn(`[finance] descripción desconocida en tx ${tx.id}: "${desc}"`);
    }
  }

  // Anclar al currentcapital de BD: la BD es la verdad operativa
  const bdCapital = Number(loan.currentcapital || 0);
  if (Math.abs(bdCapital - runningCapital) > 0.01) {
    runningCapital = bdCapital;
  }

  // Generar intereses pendientes desde la última tx hasta hoy con el capital anclado
  generateInterestUntil(today);

  // last payment metadata (igual que la versión anterior)
  const paymentTxs = txs.filter((t) => Number(t.amount) > 0);
  const lastPayment = paymentTxs.length > 0 ? paymentTxs[paymentTxs.length - 1] : null;
  const lastPaymentDate = lastPayment ? Number(lastPayment.date) : null;
  let lastPaymentMonth: string | null = null;
  if (lastPaymentDate) {
    const d = new Date(lastPaymentDate);
    lastPaymentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  const pendingInterest = Math.max(0, interestOwed - interestPaid);
  const monthlyInterestAmount = runningCapital * rate;
  const debtMonths = monthlyInterestAmount > 0 ? pendingInterest / monthlyInterestAmount : 0;
  const isOverdue = debtMonths > 1.0;

  let statusColor: 'green' | 'yellow' | 'red' = 'green';
  if (debtMonths >= 2.0) statusColor = 'red';
  else if (debtMonths >= 1.0) statusColor = 'yellow';

  return {
    loan,
    client,
    totalInterestGenerated: interestOwed,
    totalInterestPaid: interestPaid,
    pendingInterest,
    isOverdue,
    monthsPassed: getGeneratedPeriods(loan.startdate),
    monthlyInterestAmount,
    statusColor,
    debtMonths,
    lastPaymentDate,
    lastPaymentMonth,
  };
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(amount);
};
```

- [ ] **Step 3: Verificar que el typecheck de Vite pasa**

Run: `npm run build`
Expected: build pasa sin errores de TypeScript. Warnings sobre módulos no usados son aceptables si no son del archivo modificado.

- [ ] **Step 4: Commit**

```bash
git add utils/finance.ts
git commit -m "$(cat <<'EOF'
fix(finance): rewrite calculateLoanSummary with chronological simulation

Replaces the buggy formula (which mixed all payments against generated
interest using current capital) with a step-by-step simulation that
distinguishes payment types by description and tracks running capital
across history. Anchors to loans.currentcapital after the last tx so the
current month's interest reflects real operational capital.

Resolves the issue where loans with pure capital payments showed $0
pending interest despite having accumulated debt.
EOF
)"
```

---

### Task 2: Verificar contra `.claude/simulate.py` y Dashboard

**Files:**
- Run: `npm run dev`
- Read: visual del Dashboard en navegador

- [ ] **Step 1: Levantar el dev server**

```bash
npm run dev
```

Expected: dev server arrancando en http://localhost:3000.

- [ ] **Step 2: Login y acceder al Dashboard**

Abrir http://localhost:3000 en el navegador. Login con la contraseña del sistema. Llegar a la vista Dashboard.

- [ ] **Step 3: Verificar 5 préstamos clave contra simulate.py**

Comparar visualmente en el Dashboard los siguientes préstamos. Para cada uno, abrir la card y leer el "Interés Pendiente":

| Cliente | Esperado en UI | Estado |
|---|---:|---|
| Oscar Entrenador | $240,000 | amarillo |
| Jose Zapata | ~$1,123,090 | rojo |
| Ahijado Felipe Néstor | ~$1,244,000 | rojo |
| Leonel Gym | $0 | verde |
| Octavio villa | $0 | verde |

Si los números difieren más de ~$100 (margen de redondeo de aniversarios), revisar la implementación. Si los números coinciden razonablemente, OK.

- [ ] **Step 4: Verificar el card de "Pendiente" total en el header del Dashboard**

El widget "Pendiente" en la fila de quick stats debe mostrar un valor cercano a **$5,769,560** (con filtro "Todos"), pero ajustado por el anclaje BD vs sim. Aceptable cualquier valor entre $5.5M y $6M.

- [ ] **Step 5: Detener dev server (Ctrl+C)**

No commit en este task — es solo verificación.

---

### Task 3: Restringir `UpdateLoanParams` en `lib/functions.ts`

**Files:**
- Modify: `lib/functions.ts` (interface `UpdateLoanParams`, líneas 26-32)

- [ ] **Step 1: Editar la interface**

Reemplazar en [lib/functions.ts](lib/functions.ts):

```ts
export interface UpdateLoanParams {
  loanId: string;
  monthlyrate?: number;
  currentcapital?: number;
  initialcapital?: number;
  owner?: string;
}
```

por:

```ts
export interface UpdateLoanParams {
  loanId: string;
  monthlyrate?: number;
  owner?: string;
}
```

- [ ] **Step 2: Run typecheck para descubrir todos los call sites afectados**

Run: `npm run build`
Expected: errores de TypeScript en `App.tsx` (en el wrapper `updateLoan` que aún pasa `currentcapital` e `initialcapital`). Ese error se resuelve en Task 4.

NO commitear todavía — el repo queda en estado inconsistente. Continuar con Task 4.

---

### Task 4: Actualizar wrapper `updateLoan` en `App.tsx`

**Files:**
- Modify: `App.tsx` (función `updateLoan`, líneas 296-311)

- [ ] **Step 1: Cambiar la firma del wrapper**

Reemplazar en [App.tsx](App.tsx) la función actual:

```tsx
  const updateLoan = async (loanId: string, monthlyrate?: number, currentcapital?: number, initialcapital?: number, owner?: string) => {
    try {
      const result = await updateLoanFunction({
        loanId,
        monthlyrate,
        currentcapital,
        initialcapital,
        owner
      });
      showToast(result.message || "Préstamo actualizado correctamente");
      fetchData();
    } catch (error: any) {
      console.error('Update loan error:', error);
      showToast(error.message || "Error al actualizar el préstamo", "error");
    }
  };
```

por:

```tsx
  const updateLoan = async (loanId: string, monthlyrate?: number, owner?: string) => {
    try {
      const result = await updateLoanFunction({
        loanId,
        monthlyrate,
        owner
      });
      showToast(result.message || "Préstamo actualizado correctamente");
      fetchData();
    } catch (error: any) {
      console.error('Update loan error:', error);
      showToast(error.message || "Error al actualizar el préstamo", "error");
    }
  };
```

- [ ] **Step 2: Run typecheck**

Run: `npm run build`
Expected: errores en `views/Dashboard.tsx` por la firma `onUpdateLoan` (props type) y por las llamadas con 3 y 5 argumentos. Se resuelven en Task 5.

NO commitear todavía. Continuar con Task 5.

---

### Task 5: Bloquear edición de capital en el modal del Dashboard

**Files:**
- Modify: `views/Dashboard.tsx` (props type línea 16, state línea 80, handlers en líneas 493/518/528-569/563)

- [ ] **Step 1: Cambiar la firma de la prop `onUpdateLoan`**

En [views/Dashboard.tsx:16](views/Dashboard.tsx#L16), reemplazar:

```tsx
  onUpdateLoan: (loanId: string, monthlyrate?: number, currentcapital?: number, initialcapital?: number, owner?: string) => void;
```

por:

```tsx
  onUpdateLoan: (loanId: string, monthlyrate?: number, owner?: string) => void;
```

- [ ] **Step 2: Eliminar el state `editCapital`**

En [views/Dashboard.tsx:80](views/Dashboard.tsx#L80), eliminar la línea:

```tsx
  const [editCapital, setEditCapital] = useState('');
```

- [ ] **Step 3: Limpiar referencias a `setEditCapital` en el botón X del header del modal**

En [views/Dashboard.tsx:493](views/Dashboard.tsx#L493), reemplazar:

```tsx
                onClick={() => { setSelectedLoan(null); setIsEditing(false); setEditRate(''); setEditCapital(''); setPaymentType('interest'); }}
```

por:

```tsx
                onClick={() => { setSelectedLoan(null); setIsEditing(false); setEditRate(''); setPaymentType('interest'); }}
```

- [ ] **Step 4: Limpiar referencias en el botón "Editar"**

En [views/Dashboard.tsx:515-519](views/Dashboard.tsx#L515-L519), reemplazar:

```tsx
                          onClick={() => {
                            setIsEditing(true);
                            setEditRate(selectedLoan.loan.monthlyrate.toString());
                            setEditCapital(selectedLoan.loan.currentcapital.toString());
                          }}
```

por:

```tsx
                          onClick={() => {
                            setIsEditing(true);
                            setEditRate(selectedLoan.loan.monthlyrate.toString());
                          }}
```

- [ ] **Step 5: Eliminar el input de Capital del modo edición**

En [views/Dashboard.tsx:528-569](views/Dashboard.tsx#L528-L569), reemplazar todo el bloque `isEditing ? (...)` por:

```tsx
                    {isEditing ? (
                      <div className="mt-3 pt-3 border-t border-white/20 relative space-y-3">
                        <div>
                          <p className="text-[9px] font-semibold opacity-80 uppercase mb-1">Tasa %</p>
                          <input
                            type="number"
                            step="0.1"
                            value={editRate}
                            onChange={(e) => setEditRate(e.target.value)}
                            className="w-full bg-white/20 backdrop-blur border border-white/30 rounded-lg px-2 py-2 text-sm font-bold text-white placeholder-white/50 focus:outline-none focus:border-white/50"
                            placeholder="Tasa"
                          />
                          <p className="text-[9px] opacity-70 mt-1.5 leading-tight">
                            El capital solo se modifica con Abono a Capital o Inyección.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              onUpdateLoan(selectedLoan.loan.id, Number(editRate));
                              setIsEditing(false);
                              setSelectedLoan(null);
                            }}
                            className="flex-1 py-2 bg-white text-accent rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all hover:bg-white/90 flex items-center justify-center gap-2"
                          >
                            <Save size={14} /> Guardar
                          </button>
                          <button
                            onClick={() => { setIsEditing(false); setEditRate(''); }}
                            className="px-3 py-2 bg-white/20 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all hover:bg-white/30"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
```

(El bloque `: (` y la rama "no-editing" que sigue se mantienen igual.)

- [ ] **Step 6: Actualizar la llamada al cambiar etiqueta (owner)**

En [views/Dashboard.tsx:600](views/Dashboard.tsx#L600), reemplazar:

```tsx
                                onUpdateLoan(selectedLoan.loan.id, undefined, undefined, undefined, opt);
```

por:

```tsx
                                onUpdateLoan(selectedLoan.loan.id, undefined, opt);
```

- [ ] **Step 7: Run typecheck**

Run: `npm run build`
Expected: build pasa sin errores. Si hay errores, leer y corregir referencias residuales a `editCapital`/`setEditCapital`.

- [ ] **Step 8: Commit (Tasks 3+4+5 juntas — los 3 archivos van como un solo cambio coherente)**

```bash
git add lib/functions.ts App.tsx views/Dashboard.tsx
git commit -m "$(cat <<'EOF'
fix(loan-edit): block direct capital edits from UI

- UpdateLoanParams now only accepts monthlyrate and owner
- Dashboard edit modal removes the capital input; only rate is editable
- Capital changes must go through Abono a Capital or Inyección flows
  which register transactions, preventing silent BD divergence

Updates the App.tsx wrapper signature accordingly.
EOF
)"
```

---

### Task 6: Rechazar campos de capital en la Edge Function `update-loan`

**Files:**
- Modify: `supabase/functions/update-loan/index.ts` (líneas 22-29 y 46-50)

- [ ] **Step 1: Validar y rechazar campos peligrosos al inicio del handler**

En [supabase/functions/update-loan/index.ts:22](supabase/functions/update-loan/index.ts#L22), reemplazar:

```ts
    const { loanId, monthlyrate, currentcapital, initialcapital, owner } = await req.json();

    if (!loanId) {
      return new Response(
        JSON.stringify({ error: 'loanId es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
```

por:

```ts
    const body = await req.json();
    const { loanId, monthlyrate, owner } = body;

    if (!loanId) {
      return new Response(
        JSON.stringify({ error: 'loanId es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Bloquear edición directa de capital. El capital solo se modifica vía
    // register-payment (Abono a Capital) o create-loan (Inyección).
    if (body.currentcapital !== undefined || body.initialcapital !== undefined) {
      return new Response(
        JSON.stringify({
          error: 'No se permite modificar capital desde update-loan. Usar Abono a Capital o Inyección de Capital.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
```

- [ ] **Step 2: Limpiar el bloque que armaba `updateData` con campos de capital**

En [supabase/functions/update-loan/index.ts:46-50](supabase/functions/update-loan/index.ts#L46-L50), reemplazar:

```ts
    const updateData: any = {};
    if (monthlyrate !== undefined) updateData.monthlyrate = monthlyrate;
    if (currentcapital !== undefined) updateData.currentcapital = currentcapital;
    if (initialcapital !== undefined) updateData.initialcapital = initialcapital;
    if (owner !== undefined) updateData.owner = owner;
```

por:

```ts
    const updateData: Record<string, unknown> = {};
    if (monthlyrate !== undefined) updateData.monthlyrate = monthlyrate;
    if (owner !== undefined) updateData.owner = owner;
```

- [ ] **Step 3: Desplegar la Edge Function**

```bash
supabase functions deploy update-loan --project-ref ougsplrbvypxflyyfojm
```

Expected: deploy exitoso. Si falla por falta de CLI o auth, anotar y proceder con el commit del código — el deploy lo hará el usuario manualmente.

- [ ] **Step 4: Verificar el bloqueo con un POST manual (opcional)**

```bash
KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91Z3NwbHJidnlweGZseXlmb2ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMDM5MzEsImV4cCI6MjA4MjY3OTkzMX0._eNbqQ8S5uaJbgxpo2WtY_U9OgaKyMV7etpVzifd2j4"
curl -s -X POST "https://ougsplrbvypxflyyfojm.supabase.co/functions/v1/update-loan" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"loanId":"test","currentcapital":999}'
```

Expected: respuesta `{"error":"No se permite modificar capital desde update-loan. Usar Abono a Capital o Inyección de Capital."}` con status 400.

(Si el usuario no desplegó la función todavía, este paso falla — saltar.)

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/update-loan/index.ts
git commit -m "$(cat <<'EOF'
fix(update-loan): reject currentcapital/initialcapital edits

Defense in depth: even if a frontend tries to send capital fields,
the Edge Function now refuses with HTTP 400. Capital only changes
via register-payment (Abono a Capital) or create-loan (Inyección),
both of which register the change as a transaction.
EOF
)"
```

---

### Task 7: Verificación final end-to-end

**Files:**
- Run: `npm run dev`

- [ ] **Step 1: Levantar dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verificar que el modal de edición ya no muestra capital**

Login → Dashboard → click en una card → click en el ícono de lápiz "Editar préstamo".

Expected: solo se ve el input "Tasa %" y el texto "El capital solo se modifica con Abono a Capital o Inyección.". No hay input de capital.

- [ ] **Step 3: Verificar que cambiar la tasa todavía funciona**

Cambiar la tasa de un préstamo (ej. de 5% a 5.0% mismo valor para no afectar nada). Click "Guardar".

Expected: toast "Préstamo actualizado correctamente". El modal se cierra.

- [ ] **Step 4: Verificar préstamos clave con deuda visible**

Volver a verificar (como en Task 2) que los préstamos con deuda aparecen ahora con el color y monto correctos.

- [ ] **Step 5: Verificar que el card de "Pendiente" arriba muestra ~$5.7M**

El número exacto depende del anclaje BD por préstamo, pero debe ser claramente >$5M y <$6.5M.

- [ ] **Step 6: Detener dev server (Ctrl+C)**

No commit en este task — es solo verificación visual final.

---

## Self-Review

**Spec coverage:**
- ✅ Algoritmo nuevo de `calculateLoanSummary` con simulación cronológica → Task 1
- ✅ Manejo de las 6 descripciones (`Pago Intereses`, `APERTURA`, `Mixto`, `Abono a Capital`, `INYECCIÓN`, `Pago Intereses + capital`) → Task 1, en el switch de la función
- ✅ Anclaje a BD `currentcapital` (Opción 2b) → Task 1
- ✅ `console.warn` para descripciones desconocidas → Task 1
- ✅ Tipos restringidos en `UpdateLoanParams` → Task 3
- ✅ Wrapper `updateLoan` en `App.tsx` actualizado → Task 4
- ✅ Modal Dashboard sin input de capital, sin state `editCapital` → Task 5
- ✅ Edge Function `update-loan` rechaza campos de capital → Task 6
- ✅ Verificación contra `simulate.py` y Dashboard → Tasks 2 y 7
- ✅ No migración de BD, no backfill, no badge de divergencia → respetado (no aparecen tasks de eso)

**Placeholder scan:** sin TBDs, todos los code blocks completos, todos los paths absolutos.

**Type consistency:** la firma `(loanId, monthlyrate?, owner?)` es consistente entre `lib/functions.ts` (Task 3), `App.tsx` (Task 4) y `views/Dashboard.tsx` (Task 5). El nombre `onUpdateLoan` para la prop se mantiene.
