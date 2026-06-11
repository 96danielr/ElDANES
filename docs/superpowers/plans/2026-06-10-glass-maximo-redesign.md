# Glass Máximo Nu Reskin + Backend Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the app with maximum-intensity light glassmorphism (Nu purple identity) and harden the backend: atomic RPCs, server-side interest calculation, input validation, targeted realtime, optimistic updates.

**Architecture:** The visual theme lives entirely in `index.html`'s `<style>` block (existing convention) plus decorative orb divs in `<body>`. Financial calculation moves to a single shared module `supabase/functions/_shared/finance.ts` (UTC-based) consumed by both the frontend (`utils/finance.ts` delegates to it) and the Edge Functions. Write atomicity is guaranteed by two Postgres RPCs (`supabase-rpc.sql`) called from the Edge Functions with row locks. `App.tsx` switches from full-refetch-on-every-event to targeted state updates plus optimistic application of Edge Function responses.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Tailwind CDN, Supabase (PostgreSQL + Deno Edge Functions), esbuild (already in node_modules) for the test script.

**Spec:** `docs/superpowers/specs/2026-06-10-glass-maximo-redesign-design.md`

**Important constraints:**
- NO database schema changes (tables/columns/data). Creating SQL functions (RPC) IS allowed.
- Do NOT commit the user's unrelated pending changes to `package.json`, `package-lock.json`, `vite.config.ts`.
- Timezone decision (deliberate): all date arithmetic moves to UTC methods on both client and server so they always agree. Consequence: loans created late evening local time may shift their anniversary day by one; capital is anchored to the DB so amounts stay correct.

---

### Task 1: Shared finance core with UTC arithmetic (TDD)

**Files:**
- Create: `supabase/functions/_shared/finance.ts`
- Create: `scripts/test-finance-shared.mjs`
- Modify: `utils/finance.ts` (delegate to shared core)

- [ ] **Step 1: Write the failing test** — create `scripts/test-finance-shared.mjs`:

```js
// Tests for supabase/functions/_shared/finance.ts (single source of truth
// for interest calculation, shared by frontend and Edge Functions).
// Transpiles the TS module with esbuild, then asserts known scenarios.
import { build } from 'esbuild';
import { strict as assert } from 'node:assert';
import { pathToFileURL } from 'node:url';
import { mkdirSync, rmSync } from 'node:fs';

const OUT_DIR = '.claude/tmp-test';
mkdirSync(OUT_DIR, { recursive: true });
await build({
  entryPoints: ['supabase/functions/_shared/finance.ts'],
  bundle: true,
  format: 'esm',
  outfile: `${OUT_DIR}/finance.mjs`,
  logLevel: 'silent',
});
const fin = await import(pathToFileURL(`${OUT_DIR}/finance.mjs`).href);

const MS = (iso) => Date.parse(iso);
const loan = (over = {}) => ({
  id: 'L1', clientid: 'C1', initialcapital: 1_000_000, currentcapital: 1_000_000,
  monthlyrate: 10, startdate: MS('2026-01-15T12:00:00Z'), isactive: true, ...over,
});
const tx = (date, description, amount = 0) => ({
  id: 't' + date, loanid: 'L1', amount, date: MS(date), description,
});

let n = 0;
const t = (name, fn) => { fn(); n++; console.log(`ok ${n} - ${name}`); };

t('3 anniversaries, no payments → pending 300k', () => {
  const s = fin.computeInterestState(loan(), [], MS('2026-04-20T12:00:00Z'));
  assert.equal(s.interestOwed, 300_000);
  assert.equal(s.pendingInterest, 300_000);
});

t('interest payment reduces pending', () => {
  const txs = [tx('2026-02-20T12:00:00Z', 'Pago Intereses', 100_000)];
  const s = fin.computeInterestState(loan(), txs, MS('2026-04-20T12:00:00Z'));
  assert.equal(s.pendingInterest, 200_000);
});

t('capital injection raises base for later periods', () => {
  const txs = [tx('2026-02-20T12:00:00Z', 'INYECCIÓN CAPITAL (+500000)', 0)];
  const l = loan({ currentcapital: 1_500_000, initialcapital: 1_500_000 });
  // Feb 15 on 1M = 100k; Mar 15 + Apr 15 on 1.5M = 150k each → 400k
  const s = fin.computeInterestState(l, txs, MS('2026-04-20T12:00:00Z'));
  assert.equal(s.interestOwed, 400_000);
});

t('abono a capital reduces base for later periods', () => {
  const txs = [tx('2026-02-20T12:00:00Z', 'Abono a Capital', 500_000)];
  const l = loan({ currentcapital: 500_000 });
  // Feb 15 on 1M = 100k; Mar 15 + Apr 15 on 500k = 50k each → 200k
  const s = fin.computeInterestState(l, txs, MS('2026-04-20T12:00:00Z'));
  assert.equal(s.interestOwed, 200_000);
  assert.equal(s.pendingInterest, 200_000);
});

t('mixed payment splits interest-first', () => {
  const txs = [tx('2026-02-20T12:00:00Z', 'Abono Mixto (Int + Cap)', 150_000)];
  const l = loan({ currentcapital: 950_000 });
  // Feb 15 owed 100k → 100k to interest, 50k to capital.
  // Mar 15 + Apr 15 on 950k = 95k each → owed 290k, paid 100k → pending 190k
  const s = fin.computeInterestState(l, txs, MS('2026-04-20T12:00:00Z'));
  assert.equal(s.pendingInterest, 190_000);
});

t('end-of-month start clamps anniversary day', () => {
  const l = loan({ startdate: MS('2026-01-31T12:00:00Z') });
  // 2026 is not a leap year → Feb anniversary on Feb 28
  const s1 = fin.computeInterestState(l, [], MS('2026-02-27T12:00:00Z'));
  assert.equal(s1.interestOwed, 0);
  const s2 = fin.computeInterestState(l, [], MS('2026-03-01T12:00:00Z'));
  assert.equal(s2.interestOwed, 100_000);
});

t('capital anchors to DB currentcapital when diverged', () => {
  // DB says 800k but txs imply 1M → future interest uses 800k
  const l = loan({ currentcapital: 800_000 });
  const s = fin.computeInterestState(l, [], MS('2026-02-16T12:00:00Z'));
  assert.equal(s.interestOwed, 100_000); // Feb 15 generated on 1M (before anchor)
  assert.equal(s.runningCapital, 800_000);
});

t('calculatePendingInterest helper matches', () => {
  const p = fin.calculatePendingInterest(loan(), [], MS('2026-04-20T12:00:00Z'));
  assert.equal(p, 300_000);
});

rmSync(OUT_DIR, { recursive: true, force: true });
console.log(`\n${n} tests passed`);
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node scripts/test-finance-shared.mjs`
Expected: FAIL — esbuild cannot resolve `supabase/functions/_shared/finance.ts` (file does not exist).

- [ ] **Step 3: Implement `supabase/functions/_shared/finance.ts`**

Pure module, no imports, structural types, UTC arithmetic, explicit `nowMs`. Logic is the port of `utils/finance.ts:37-106` (chronological simulation) — semantics preserved except local→UTC date methods:

```ts
// Núcleo de cálculo financiero — única fuente de verdad.
// Consumido por las Edge Functions (Deno) y por el frontend vía utils/finance.ts.
// Toda la aritmética de fechas usa métodos UTC para que cliente y servidor
// coincidan siempre, independiente de la zona horaria del runtime.

export interface FinLoan {
  id: string;
  initialcapital: number | string;
  currentcapital: number | string;
  monthlyrate: number | string;
  startdate: number | string;
}

export interface FinTransaction {
  id?: string;
  loanid: string;
  amount: number | string;
  date: number | string;
  description: string | null;
}

export interface InterestState {
  interestOwed: number;
  interestPaid: number;
  pendingInterest: number;
  runningCapital: number;
}

// n-ésimo aniversario mensual desde start (ms epoch), con el día ajustado al
// último día válido del mes destino (préstamos iniciados a fin de mes).
export const anniversaryFromStartUTC = (startMs: number, n: number): number => {
  const s = new Date(startMs);
  const year = s.getUTCFullYear();
  const month = s.getUTCMonth() + n;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(s.getUTCDate(), lastDay);
  return Date.UTC(year, month, day, s.getUTCHours(), s.getUTCMinutes(), s.getUTCSeconds(), s.getUTCMilliseconds());
};

export const getGeneratedPeriodsUTC = (startMs: number, nowMs: number): number => {
  const start = new Date(Number(startMs));
  const now = new Date(nowMs);
  let months = (now.getUTCFullYear() - start.getUTCFullYear()) * 12;
  months += now.getUTCMonth() - start.getUTCMonth();
  if (now.getUTCDate() < start.getUTCDate()) months -= 1;
  return Math.max(0, months);
};

// Simulación cronológica: genera interés en cada aniversario y aplica las
// transacciones en orden. Ancla el capital al currentcapital de BD al final
// (la BD es la verdad operativa) antes de generar el interés restante.
export const computeInterestState = (
  loan: FinLoan,
  transactions: FinTransaction[],
  nowMs: number
): InterestState => {
  const rate = Number(loan.monthlyrate || 0) / 100;
  const startMs = Number(loan.startdate);

  const txs = transactions
    .filter((t) => t.loanid === loan.id)
    .sort((a, b) => Number(a.date) - Number(b.date));

  let runningCapital = Number(loan.initialcapital || 0);
  let interestOwed = 0;
  let interestPaid = 0;
  let anniversaryIndex = 1;
  let nextAnniversary = anniversaryFromStartUTC(startMs, anniversaryIndex);

  const generateInterestUntil = (cutoffMs: number) => {
    while (nextAnniversary <= cutoffMs) {
      interestOwed += runningCapital * rate;
      anniversaryIndex += 1;
      nextAnniversary = anniversaryFromStartUTC(startMs, anniversaryIndex);
    }
  };

  for (const tx of txs) {
    generateInterestUntil(Number(tx.date));

    const desc = (tx.description || '').trim();
    const amount = Number(tx.amount || 0);
    const descUpper = desc.toUpperCase();

    if (descUpper.includes('APERTURA')) continue;

    if (descUpper.includes('INYECCI')) {
      const match = desc.match(/\+(\d+)/);
      if (match) runningCapital += Number(match[1]);
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
    }
    // Liquidaciones y descripciones desconocidas no alteran la simulación.
  }

  const bdCapital = Number(loan.currentcapital || 0);
  if (Math.abs(bdCapital - runningCapital) > 0.01) {
    runningCapital = bdCapital;
  }

  generateInterestUntil(nowMs);

  return {
    interestOwed,
    interestPaid,
    pendingInterest: Math.max(0, interestOwed - interestPaid),
    runningCapital,
  };
};

export const calculatePendingInterest = (
  loan: FinLoan,
  transactions: FinTransaction[],
  nowMs: number
): number => computeInterestState(loan, transactions, nowMs).pendingInterest;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node scripts/test-finance-shared.mjs`
Expected: `8 tests passed`

- [ ] **Step 5: Rewrite `utils/finance.ts` to delegate to the shared core**

Keep the exact same export signatures (`getGeneratedPeriods`, `calculateLoanSummary`, `formatCurrency`) so views don't change:

```ts
import { Loan, Transaction, LoanSummary, Client } from '../types';
import {
  computeInterestState,
  getGeneratedPeriodsUTC,
} from '../supabase/functions/_shared/finance';

export const getGeneratedPeriods = (start: number): number =>
  getGeneratedPeriodsUTC(Number(start), Date.now());

export const calculateLoanSummary = (
  loan: Loan,
  client: Client,
  transactions: Transaction[]
): LoanSummary => {
  const now = Date.now();
  const txs = transactions
    .filter((t) => t.loanid === loan.id)
    .sort((a, b) => Number(a.date) - Number(b.date));

  const { interestOwed, interestPaid, pendingInterest, runningCapital } =
    computeInterestState(loan, txs, now);

  const paymentTxs = txs.filter((t) => Number(t.amount) > 0);
  const lastPayment = paymentTxs.length > 0 ? paymentTxs[paymentTxs.length - 1] : null;
  const lastPaymentDate = lastPayment ? Number(lastPayment.date) : null;
  let lastPaymentMonth: string | null = null;
  if (lastPaymentDate) {
    const d = new Date(lastPaymentDate);
    lastPaymentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  const monthlyInterestAmount = runningCapital * Number(loan.monthlyrate || 0) / 100;
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

Note: the old `console.warn` for unknown descriptions moves out (the shared core stays silent — Edge Functions shouldn't spam logs for legacy descriptions like 'PAGO DE LIQUIDACIÓN TOTAL' on settled loans).

- [ ] **Step 6: Verify the frontend builds**

Run: `npm run build`
Expected: build succeeds with no TS resolution errors for the cross-folder import.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/_shared/finance.ts scripts/test-finance-shared.mjs utils/finance.ts
git commit -m "refactor(finance): extract shared UTC finance core for client+server parity"
```

---

### Task 2: Atomic RPCs (`supabase-rpc.sql`)

**Files:**
- Create: `supabase-rpc.sql`

- [ ] **Step 1: Confirm `loans.id` column type** (uuid vs bigint) before writing the SQL.

Run (PowerShell, anon key is public — it's in `lib/supabase.ts`):
```powershell
$h = @{ apikey = '<anon key from lib/supabase.ts>' }
(Invoke-RestMethod -Uri 'https://ougsplrbvypxflyyfojm.supabase.co/rest/v1/loans?select=id&limit=1' -Headers $h)
```
Expected: an id like `"a1b2c3d4-..."` → uuid. If it's numeric, use `bigint` instead of `uuid` in the function signatures below.

- [ ] **Step 2: Write `supabase-rpc.sql`**

```sql
-- ============================================
-- RPCs ATÓMICOS — ElDANES
-- Ejecutar UNA VEZ en el SQL Editor de Supabase.
-- No crea ni modifica tablas, columnas ni datos.
-- ============================================

-- Pago atómico: bloquea la fila del préstamo, valida, inserta la transacción
-- y descuenta capital en UNA transacción SQL. Elimina la condición de carrera
-- entre insert de transacción y update de capital.
create or replace function register_payment_atomic(
  p_loan_id uuid,
  p_amount numeric,
  p_interest_paid numeric,
  p_capital_reduction numeric,
  p_description text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan loans%rowtype;
  v_tx transactions%rowtype;
  v_now_ms bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  select * into v_loan from loans where id = p_loan_id for update;
  if not found then
    raise exception 'LOAN_NOT_FOUND';
  end if;
  if not v_loan.isactive then
    raise exception 'LOAN_INACTIVE';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;
  if p_interest_paid < 0 or p_capital_reduction < 0
     or (p_interest_paid + p_capital_reduction) <> p_amount then
    raise exception 'INVALID_SPLIT';
  end if;
  if p_capital_reduction > v_loan.currentcapital then
    raise exception 'CAPITAL_EXCEEDED';
  end if;

  -- Guard anti doble-clic / reintento de red: mismo préstamo + mismo monto
  -- en los últimos 10 segundos.
  if exists (
    select 1 from transactions
    where loanid = p_loan_id
      and amount = p_amount
      and date > v_now_ms - 10000
  ) then
    raise exception 'DUPLICATE_PAYMENT';
  end if;

  insert into transactions (loanid, amount, date, description)
  values (p_loan_id, p_amount, v_now_ms, p_description)
  returning * into v_tx;

  if p_capital_reduction > 0 then
    update loans
       set currentcapital = greatest(0, currentcapital - p_capital_reduction)
     where id = p_loan_id
     returning * into v_loan;
  end if;

  return jsonb_build_object('loan', to_jsonb(v_loan), 'transaction', to_jsonb(v_tx));
end
$$;

-- Liquidación atómica e idempotente: bloquea la fila; si el préstamo ya está
-- inactivo, una segunda liquidación (concurrente o repetida) falla limpiamente.
create or replace function settle_loan_atomic(
  p_loan_id uuid,
  p_amount numeric,
  p_description text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan loans%rowtype;
  v_tx transactions%rowtype;
  v_now_ms bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  select * into v_loan from loans where id = p_loan_id for update;
  if not found then
    raise exception 'LOAN_NOT_FOUND';
  end if;
  if not v_loan.isactive then
    raise exception 'ALREADY_SETTLED';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  insert into transactions (loanid, amount, date, description)
  values (p_loan_id, p_amount, v_now_ms, p_description)
  returning * into v_tx;

  update loans
     set isactive = false,
         currentcapital = 0
   where id = p_loan_id
   returning * into v_loan;

  return jsonb_build_object('loan', to_jsonb(v_loan), 'transaction', to_jsonb(v_tx));
end
$$;

-- Solo las Edge Functions (service role) pueden ejecutarlos.
revoke execute on function register_payment_atomic(uuid, numeric, numeric, numeric, text) from public, anon, authenticated;
revoke execute on function settle_loan_atomic(uuid, numeric, text) from public, anon, authenticated;
grant execute on function register_payment_atomic(uuid, numeric, numeric, numeric, text) to service_role;
grant execute on function settle_loan_atomic(uuid, numeric, text) to service_role;
```

- [ ] **Step 3: Commit**

```bash
git add supabase-rpc.sql
git commit -m "feat(db): add atomic RPCs for payment and settlement (row-lock, dup guard)"
```

(The SQL is applied to Supabase in Task 6 — deploy phase.)

---

### Task 3: Edge Functions — shared CORS, validations, server-side interest, RPC calls

**Files:**
- Create: `supabase/functions/_shared/cors.ts`
- Modify: `supabase/functions/register-payment/index.ts` (full rewrite)
- Modify: `supabase/functions/settle-loan/index.ts` (full rewrite)
- Modify: `supabase/functions/create-loan/index.ts` (validations + ownership + return transaction)
- Modify: `supabase/functions/update-loan/index.ts` (rate validation + shared CORS)

- [ ] **Step 1: Create `supabase/functions/_shared/cors.ts`**

```ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
```

- [ ] **Step 2: Rewrite `supabase/functions/register-payment/index.ts`**

```ts
// Edge Function: Registrar pago
// El interés pendiente se calcula EN EL SERVIDOR (no se confía en el cliente).
// La escritura (transacción + capital) es atómica vía RPC register_payment_atomic.
// paymentType: 'interest' | 'capital' | 'mixed'

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { calculatePendingInterest } from '../_shared/finance.ts';

const RPC_ERRORS: Record<string, { status: number; message: string }> = {
  LOAN_NOT_FOUND: { status: 404, message: 'Préstamo no encontrado' },
  LOAN_INACTIVE: { status: 400, message: 'El préstamo está liquidado' },
  INVALID_AMOUNT: { status: 400, message: 'Monto inválido' },
  INVALID_SPLIT: { status: 400, message: 'Distribución de pago inválida' },
  CAPITAL_EXCEEDED: { status: 400, message: 'El abono a capital excede el capital actual' },
  DUPLICATE_PAYMENT: { status: 400, message: 'Pago duplicado detectado (mismo monto en los últimos segundos)' },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { loanId, amount, paymentType } = await req.json();

    if (!loanId) return jsonResponse({ error: 'loanId es requerido' }, 400);
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return jsonResponse({ error: 'El monto debe ser un número mayor a 0' }, 400);
    }

    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      return jsonResponse({ error: 'Préstamo no encontrado' }, 404);
    }
    if (!loan.isactive) {
      return jsonResponse({ error: 'El préstamo está liquidado' }, 400);
    }

    // Interés pendiente calculado en el servidor con las transacciones reales
    const { data: txs, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('loanid', loanId);

    if (txError) {
      return jsonResponse({ error: 'Error al leer transacciones', details: txError.message }, 500);
    }

    const pendingInterest = calculatePendingInterest(loan, txs ?? [], Date.now());

    let payToInterest = 0;
    let payToCapital = 0;
    let description = '';
    const type = paymentType || 'mixed';

    if (type === 'interest') {
      payToInterest = numAmount;
      description = 'Pago Intereses';
    } else if (type === 'capital') {
      payToCapital = numAmount;
      description = 'Abono a Capital';
    } else {
      payToInterest = Math.min(numAmount, pendingInterest);
      payToCapital = numAmount - payToInterest;
      if (payToCapital > 0 && payToInterest > 0) {
        description = 'Abono Mixto (Int + Cap)';
      } else if (payToCapital > 0) {
        description = 'Abono a Capital';
      } else {
        description = 'Pago Intereses';
      }
    }

    if (payToCapital > Number(loan.currentcapital)) {
      return jsonResponse({ error: 'El abono a capital excede el capital actual' }, 400);
    }

    const { data: result, error: rpcError } = await supabase.rpc('register_payment_atomic', {
      p_loan_id: loanId,
      p_amount: numAmount,
      p_interest_paid: payToInterest,
      p_capital_reduction: payToCapital,
      p_description: description,
    });

    if (rpcError) {
      const known = RPC_ERRORS[rpcError.message?.trim()];
      if (known) return jsonResponse({ error: known.message }, known.status);
      return jsonResponse({ error: 'Error al registrar el pago', details: rpcError.message }, 500);
    }

    return jsonResponse({
      success: true,
      message: payToCapital > 0 && payToInterest > 0
        ? `Pago registrado: ${payToInterest} a interés, ${payToCapital} a capital`
        : payToCapital > 0
          ? `Abono a capital registrado: -${payToCapital}`
          : 'Pago de intereses registrado',
      loan: result.loan,
      transaction: result.transaction,
      payToInterest,
      payToCapital,
      pendingInterest,
    });
  } catch (error) {
    return jsonResponse({ error: 'Error interno del servidor', details: error.message }, 500);
  }
});
```

- [ ] **Step 3: Rewrite `supabase/functions/settle-loan/index.ts`**

```ts
// Edge Function: Liquidar préstamo
// El total a liquidar se recalcula EN EL SERVIDOR; si difiere materialmente
// del esperado por el cliente (datos desactualizados), responde 409 con el
// valor correcto. La escritura es atómica e idempotente vía settle_loan_atomic.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { calculatePendingInterest } from '../_shared/finance.ts';

const TOLERANCE = 1; // $1 por redondeo

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { loanId, totalDue } = await req.json();

    if (!loanId) return jsonResponse({ error: 'loanId es requerido' }, 400);
    const expected = Number(totalDue);
    if (!Number.isFinite(expected) || expected <= 0) {
      return jsonResponse({ error: 'totalDue debe ser un número mayor a 0' }, 400);
    }

    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      return jsonResponse({ error: 'Préstamo no encontrado' }, 404);
    }
    if (!loan.isactive) {
      return jsonResponse({ error: 'El préstamo ya está liquidado' }, 400);
    }

    const { data: txs, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('loanid', loanId);

    if (txError) {
      return jsonResponse({ error: 'Error al leer transacciones', details: txError.message }, 500);
    }

    const pendingInterest = calculatePendingInterest(loan, txs ?? [], Date.now());
    const serverTotal = Number(loan.currentcapital) + pendingInterest;

    if (Math.abs(serverTotal - expected) > TOLERANCE) {
      return jsonResponse({
        error: `El total a liquidar cambió: el servidor calcula $${Math.round(serverTotal).toLocaleString()}. Refresca e intenta de nuevo.`,
        serverTotal,
      }, 409);
    }

    const { data: result, error: rpcError } = await supabase.rpc('settle_loan_atomic', {
      p_loan_id: loanId,
      p_amount: serverTotal,
      p_description: 'PAGO DE LIQUIDACIÓN TOTAL',
    });

    if (rpcError) {
      const msg = rpcError.message?.trim();
      if (msg === 'ALREADY_SETTLED') return jsonResponse({ error: 'El préstamo ya está liquidado' }, 400);
      if (msg === 'LOAN_NOT_FOUND') return jsonResponse({ error: 'Préstamo no encontrado' }, 404);
      return jsonResponse({ error: 'Error al liquidar', details: rpcError.message }, 500);
    }

    return jsonResponse({
      success: true,
      message: 'Crédito liquidado con éxito',
      loan: result.loan,
      transaction: result.transaction,
    });
  } catch (error) {
    return jsonResponse({ error: 'Error interno del servidor', details: error.message }, 500);
  }
});
```

- [ ] **Step 4: Update `supabase/functions/create-loan/index.ts`**

Changes: shared CORS via `jsonResponse`; validate `capital > 0` and `rate > 0`; injection path verifies the loan belongs to the client and is active; both paths return the created `transaction`. Full file:

```ts
// Edge Function: Crear préstamo
// Maneja la creación de nuevos préstamos y la inyección de capital a existentes.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { clientId, capital, rate, customStartDate, existingLoanId } = await req.json();

    if (!clientId) return jsonResponse({ error: 'clientId es requerido' }, 400);
    const numCapital = Number(capital);
    const numRate = Number(rate);
    if (!Number.isFinite(numCapital) || numCapital <= 0) {
      return jsonResponse({ error: 'El capital debe ser un número mayor a 0' }, 400);
    }
    if (!Number.isFinite(numRate) || numRate <= 0) {
      return jsonResponse({ error: 'La tasa debe ser un número mayor a 0' }, 400);
    }

    // Inyección de capital a préstamo existente
    if (existingLoanId) {
      const { data: existingLoan, error: loanError } = await supabase
        .from('loans')
        .select('*')
        .eq('id', existingLoanId)
        .eq('clientid', clientId)
        .single();

      if (loanError || !existingLoan) {
        return jsonResponse({ error: 'Préstamo existente no encontrado para este cliente' }, 404);
      }
      if (!existingLoan.isactive) {
        return jsonResponse({ error: 'No se puede inyectar capital a un préstamo liquidado' }, 400);
      }

      const { data: updatedLoan, error: updateError } = await supabase
        .from('loans')
        .update({
          currentcapital: Number(existingLoan.currentcapital) + numCapital,
          initialcapital: Number(existingLoan.initialcapital) + numCapital,
        })
        .eq('id', existingLoanId)
        .select()
        .single();

      if (updateError) {
        return jsonResponse({ error: 'Error al actualizar capital', details: updateError.message }, 500);
      }

      const { data: tx } = await supabase
        .from('transactions')
        .insert({
          loanid: existingLoanId,
          amount: 0,
          date: Date.now(),
          description: `INYECCIÓN CAPITAL (+${numCapital})`,
        })
        .select()
        .single();

      return jsonResponse({ success: true, message: 'Capital sumado', loan: updatedLoan, transaction: tx });
    }

    // Crear nuevo préstamo
    const { data: newLoan, error: insertError } = await supabase
      .from('loans')
      .insert({
        clientid: clientId,
        initialcapital: numCapital,
        currentcapital: numCapital,
        monthlyrate: numRate,
        startdate: customStartDate || Date.now(),
        isactive: true,
        owner: 'Juntos',
      })
      .select()
      .single();

    if (insertError) {
      return jsonResponse({ error: 'Error al crear préstamo', details: insertError.message }, 500);
    }

    const { data: tx } = await supabase
      .from('transactions')
      .insert({
        loanid: newLoan.id,
        amount: 0,
        date: Date.now(),
        description: 'APERTURA DE CRÉDITO',
      })
      .select()
      .single();

    return jsonResponse({ success: true, message: 'Préstamo activado', loan: newLoan, transaction: tx });
  } catch (error) {
    return jsonResponse({ error: 'Error interno del servidor', details: error.message }, 500);
  }
});
```

- [ ] **Step 5: Update `supabase/functions/update-loan/index.ts`**

Only three changes — import shared CORS, replace every inline `corsHeaders` literal/response with `jsonResponse`, and validate the rate. Diff essence:

```ts
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
// (remove the local corsHeaders constant)

// after extracting { loanId, monthlyrate, owner }:
if (monthlyrate !== undefined) {
  const numRate = Number(monthlyrate);
  if (!Number.isFinite(numRate) || numRate <= 0) {
    return jsonResponse({ error: 'La tasa debe ser un número mayor a 0' }, 400);
  }
}
```

All other responses in the file convert to `jsonResponse(body, status)` form, preserving their messages and status codes (including the existing capital-edit rejection).

- [ ] **Step 6: Verify Deno syntax locally (best effort)**

If `deno` is installed: `deno check supabase/functions/register-payment/index.ts supabase/functions/settle-loan/index.ts supabase/functions/create-loan/index.ts supabase/functions/update-loan/index.ts`
If not installed: skip (deploy in Task 6 performs bundling and will surface syntax errors).

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/
git commit -m "feat(edge): server-side interest, atomic RPC writes, input validation, shared CORS"
```

---

### Task 4: Frontend data layer — `lib/functions.ts` + `App.tsx` targeted realtime & optimistic updates

**Files:**
- Modify: `lib/functions.ts`
- Modify: `App.tsx:103-130` (fetch/realtime), `App.tsx:150-309` (handlers)

- [ ] **Step 1: Update `lib/functions.ts`**

Remove the dead `SUPABASE_URL` const (line 4). `RegisterPaymentParams` drops `pendingInterest` (server computes it). Response types gain `transaction`:

```ts
// Helper para llamar a las Edge Functions de Supabase
import { supabase } from './supabase';
import { Loan, Transaction } from '../types';

export interface SettleLoanParams {
  loanId: string;
  totalDue: number;
}

export interface RegisterPaymentParams {
  loanId: string;
  amount: number;
  paymentType: 'interest' | 'capital' | 'mixed';
}

export interface CreateLoanParams {
  clientId: string;
  capital: number;
  rate: number;
  customStartDate?: number;
  existingLoanId?: string;
}

export interface UpdateLoanParams {
  loanId: string;
  monthlyrate?: number;
  owner?: string;
}

async function callFunction<T>(functionName: string, body: any): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, { body });

  if (error) {
    // FunctionsHttpError: el body de la respuesta trae el mensaje real del servidor
    if (error.context && typeof error.context.json === 'function') {
      try {
        const errBody = await error.context.json();
        if (errBody?.error) throw new Error(errBody.error);
      } catch (e: any) {
        if (e instanceof Error && e.message && !e.message.includes('JSON')) throw e;
      }
    }
    throw new Error(error.message || 'Error al llamar a la función');
  }

  if (!data || data.error) {
    throw new Error(data?.error || 'Error desconocido en la función');
  }

  return data as T;
}

export async function settleLoan(params: SettleLoanParams) {
  return callFunction<{ success: boolean; message: string; loan: Loan; transaction: Transaction }>(
    'settle-loan',
    params
  );
}

export async function registerPayment(params: RegisterPaymentParams) {
  return callFunction<{
    success: boolean;
    message: string;
    loan: Loan;
    transaction: Transaction;
    payToInterest: number;
    payToCapital: number;
  }>('register-payment', params);
}

export async function createLoan(params: CreateLoanParams) {
  return callFunction<{ success: boolean; message: string; loan: Loan; transaction: Transaction | null }>(
    'create-loan',
    params
  );
}

export async function updateLoan(params: UpdateLoanParams) {
  return callFunction<{ success: boolean; message: string; loan: Loan }>(
    'update-loan',
    params
  );
}
```

Note: surfacing the real server error body matters now — 400/409 messages ("Pago duplicado…", "El total a liquidar cambió…") must reach the toast.

- [ ] **Step 2: Add state helpers + targeted realtime in `App.tsx`**

Add `useRef` to the React import. Below `showToast`, add the helpers and replace the `fetchData` effect (`App.tsx:124-130`):

```ts
  const upsertById = <T extends { id: string }>(arr: T[], row: T): T[] => {
    const i = arr.findIndex((x) => x.id === row.id);
    if (i === -1) return [...arr, row];
    const copy = [...arr];
    copy[i] = row;
    return copy;
  };

  const applyLoan = (loan: Loan) => setLoans((prev) => upsertById(prev, loan));
  const applyTransaction = (tx: Transaction) =>
    setTransactions((prev) => upsertById(prev, tx).sort((a, b) => Number(b.date) - Number(a.date)));
  const applyClient = (client: Client) =>
    setClients((prev) => upsertById(prev, client).sort((a, b) => a.name.localeCompare(b.name)));
```

Replace the realtime effect:

```ts
  const wasDisconnectedRef = React.useRef(false);

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload: any) => {
        const { table, eventType } = payload;
        const row = eventType === 'DELETE' ? payload.old : payload.new;
        if (!row || row.id === undefined) {
          fetchData(); // payload incompleto → fallback seguro
          return;
        }
        if (table === 'clients') {
          if (eventType === 'DELETE') setClients((prev) => prev.filter((c) => c.id !== row.id));
          else setClients((prev) => upsertById(prev, row).sort((a, b) => a.name.localeCompare(b.name)));
        } else if (table === 'loans') {
          if (eventType === 'DELETE') setLoans((prev) => prev.filter((l) => l.id !== row.id));
          else setLoans((prev) => upsertById(prev, row));
        } else if (table === 'transactions') {
          if (eventType === 'DELETE') setTransactions((prev) => prev.filter((t) => t.id !== row.id));
          else setTransactions((prev) => upsertById(prev, row).sort((a, b) => Number(b.date) - Number(a.date)));
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && wasDisconnectedRef.current) {
          wasDisconnectedRef.current = false;
          fetchData(); // resincronizar tras reconexión
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          wasDisconnectedRef.current = true;
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, []);
```

(Note: `upsertById`, `setClients`, etc. are stable within the component; the effect keeps `[]` deps as today.)

- [ ] **Step 3: Make mutation handlers optimistic in `App.tsx`**

- `addClient` (`App.tsx:150-155`): replace `fetchData();` with `applyClient(data as Client);`
- `updateClient`: replace `fetchData();` with nothing extra — realtime UPDATE covers it; keep the toast. (Direct write returns no row here; leave one `fetchData()` only if you prefer — NO: remove it, realtime targeted update handles it.)
- `deleteClient` confirm callback: remove `fetchData();` (realtime DELETE covers it).
- `deleteLoan` confirm callback: remove `fetchData();` (realtime DELETE events for transactions and the loan cover it).
- `createLoan` (both branches): replace `fetchData();` with:
```ts
            applyLoan(result.loan);
            if (result.transaction) applyTransaction(result.transaction);
```
- `settleLoan` confirm callback: replace `fetchData();` with:
```ts
          applyLoan(result.loan);
          applyTransaction(result.transaction);
```
- `registerPayment`: drop the `summary` lookup (no longer needed — keep the `loan` existence check), drop `pendingInterest` from the call, and replace `fetchData();` with:
```ts
      applyLoan(result.loan);
      applyTransaction(result.transaction);
```
Resulting function:
```ts
  const registerPayment = async (loanId: string, amount: number, paymentType: 'interest' | 'capital' | 'mixed' = 'mixed') => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    try {
      const result = await registerPaymentFunction({ loanId, amount, paymentType });
      showToast(result.message || "Abono procesado correctamente");
      applyLoan(result.loan);
      applyTransaction(result.transaction);
    } catch (error: any) {
      console.error('Register payment error:', error);
      showToast(error.message || "Error al procesar el pago", "error");
    }
  };
```
- `updateLoan`: replace `fetchData();` with `applyLoan(result.loan);`

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: success, no type errors.

- [ ] **Step 5: Commit**

```bash
git add lib/functions.ts App.tsx
git commit -m "feat(data): targeted realtime updates and optimistic mutations (no full refetch)"
```

---

### Task 5: Glass Máximo Nu reskin (`index.html`)

**Files:**
- Modify: `index.html` (replace the entire `<style>` block content at lines 34-520; add orb divs in `<body>`)

- [ ] **Step 1: Replace the `<style>` block** (keep the Tailwind config `<script>`, font links, and importmap untouched) with:

```css
/* ========================================
   GLASS MÁXIMO NU — ElDANES
   Glassmorfismo claro, identidad morada Nu
   ======================================== */

:root {
    /* RGB tokens (Tailwind opacity modifier support) */
    --deep-rgb:         246 238 251;
    --surface-rgb:      255 255 255;
    --surface-hover-rgb:255 255 255;
    --elevated-rgb:     255 255 255;

    --accent-rgb:       138 5 190;
    --accent-hover-rgb: 107 4 146;
    --success-rgb:      0 168 120;
    --warning-rgb:      245 166 35;
    --danger-rgb:       222 53 11;
    --cyan-rgb:         6 182 212;

    /* Brand */
    --nu-purple:         #8A05BE;
    --nu-purple-hover:   #6B0492;
    --nu-purple-deep:    #4B0082;
    --nu-purple-tint:    rgba(138,5,190,0.10);
    --nu-purple-tint-2:  rgba(138,5,190,0.16);
    --nu-violet:         #B845E8;

    /* Surfaces — vidrio */
    --bg-page:           #F6EEFB;
    --bg-deep:           #F6EEFB;
    --bg-surface:        rgba(255,255,255,0.42);
    --bg-surface-hover:  rgba(255,255,255,0.55);
    --bg-elevated:       rgba(255,255,255,0.65);
    --bg-subtle:         rgba(255,255,255,0.40);
    --bg-subtle-2:       rgba(255,255,255,0.55);
    --bg-overlay:        rgba(40,16,60,0.35);

    /* Accent aliases (usados en TSX vía var()) */
    --accent:           var(--nu-purple);
    --accent-hover:     var(--nu-purple-hover);
    --accent-glow:      rgba(138,5,190,0.30);
    --accent-deep:      var(--nu-purple-deep);

    --purple:           var(--nu-purple);
    --purple-glow:      rgba(138,5,190,0.30);

    --success:          #00A878;
    --success-glow:     rgba(0,168,120,0.20);
    --success-tint:     rgba(0,168,120,0.14);
    --warning:          #F5A623;
    --warning-glow:     rgba(245,166,35,0.20);
    --warning-tint:     rgba(245,166,35,0.16);
    --danger:           #DE350B;
    --danger-glow:      rgba(222,53,11,0.20);
    --danger-tint:      rgba(222,53,11,0.12);
    --cyan:             #06B6D4;

    /* Text */
    --text-primary:     #241733;
    --text-secondary:   #5E5570;
    --text-tertiary:    #978FA6;

    /* Borders */
    --border-subtle:    rgba(124,58,180,0.08);
    --border-default:   rgba(124,58,180,0.14);
    --border-hover:     rgba(138,5,190,0.32);
    --border-accent:    rgba(138,5,190,0.30);
    --border-glass:     rgba(255,255,255,0.85);

    /* Legacy aliases (compatibilidad TSX) */
    --coin:             var(--nu-purple);
    --coin-glow:        rgba(138,5,190,0.30);
    --pixel-shadow:     none;
    --pixel-shadow-sm:  none;
    --pixel-shadow-accent: none;
    --pixel-shadow-inset: none;
    --chrome-highlight: rgba(255,255,255,0.60);
    --chrome-shadow:    rgba(76,29,116,0.06);

    /* Sombras de vidrio */
    --shadow-card:      0 12px 36px rgba(76,29,116,0.14), inset 0 1px 0 rgba(255,255,255,1);
    --shadow-card-hover:0 18px 48px rgba(76,29,116,0.20), inset 0 1px 0 rgba(255,255,255,1);
    --shadow-pop:       0 24px 64px rgba(76,29,116,0.25);

    --glass-blur:       22px;
    --glass-blur-nav:   18px;
}

*, *::before, *::after { box-sizing: border-box; }

/* ═══════════════════════════════════════
   BODY + FONDO AURORA
   ═══════════════════════════════════════ */
body {
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-tap-highlight-color: transparent;
    overflow-x: hidden;
    background-color: var(--bg-page);
    color: var(--text-primary);
    min-height: 100vh;
    min-height: 100dvh;
    font-size: 15px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

/* Aurora fija detrás de todo (pseudo-elemento: sin jank de background-attachment) */
body::before {
    content: '';
    position: fixed;
    inset: 0;
    z-index: -2;
    background:
        radial-gradient(ellipse 60% 50% at 8% 8%,  rgba(138,5,190,0.26), transparent 55%),
        radial-gradient(ellipse 50% 45% at 95% 18%, rgba(6,182,212,0.20), transparent 55%),
        radial-gradient(ellipse 55% 45% at 50% 100%, rgba(184,69,232,0.18), transparent 55%),
        linear-gradient(160deg, #F6EEFB 0%, #EAE2F4 100%);
}

/* Orbes flotantes decorativos */
.bg-orbs {
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    overflow: hidden;
}
.bg-orbs .orb {
    position: absolute;
    border-radius: 50%;
    will-change: transform;
}
.bg-orbs .orb-1 {
    width: 340px; height: 340px;
    top: -60px; right: -40px;
    background: radial-gradient(circle at 30% 30%, rgba(184,69,232,0.35), rgba(138,5,190,0.10) 70%);
    animation: orbFloat 22s ease-in-out infinite alternate;
}
.bg-orbs .orb-2 {
    width: 260px; height: 260px;
    bottom: 10%; left: -80px;
    background: radial-gradient(circle at 30% 30%, rgba(6,182,212,0.30), rgba(6,182,212,0.06) 70%);
    animation: orbFloat 26s ease-in-out infinite alternate-reverse;
}
.bg-orbs .orb-3 {
    width: 180px; height: 180px;
    top: 45%; right: 12%;
    background: radial-gradient(circle at 30% 30%, rgba(138,5,190,0.22), rgba(138,5,190,0.04) 70%);
    animation: orbFloat 18s ease-in-out infinite alternate;
}

@keyframes orbFloat {
    from { transform: translate3d(0, 0, 0) scale(1); }
    to   { transform: translate3d(30px, 40px, 0) scale(1.08); }
}

/* ═══════════════════════════════════════
   TIPOGRAFÍA
   ═══════════════════════════════════════ */
h1, h2, h3, h4, .font-display {
    font-family: 'Inter', system-ui, sans-serif;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.3;
    letter-spacing: -0.01em;
}

.font-mono {
    font-family: 'Inter', system-ui, sans-serif;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
}

input, textarea, select {
    font-size: 16px !important;
    font-family: 'Inter', system-ui, sans-serif !important;
}

@media screen and (min-width: 768px) {
    input, textarea, select { font-size: inherit !important; }
}

/* ═══════════════════════════════════════
   TARJETAS — vidrio esmerilado
   ═══════════════════════════════════════ */
.glass-card {
    background: var(--bg-surface);
    backdrop-filter: blur(var(--glass-blur)) saturate(1.4);
    -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.4);
    border: 1.5px solid var(--border-glass);
    border-radius: 18px;
    box-shadow: var(--shadow-card);
    transition: border-color 200ms ease-out, box-shadow 200ms ease-out, transform 200ms ease-out;
    position: relative;
    overflow: hidden;
}

.glass-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-card-hover);
}

/* Variantes de estado: borde y aura según el semáforo del préstamo */
.glass-card.glass-green  { border-color: rgba(0,168,120,0.45);  box-shadow: 0 12px 36px rgba(0,168,120,0.14), inset 0 1px 0 rgba(255,255,255,1); }
.glass-card.glass-yellow { border-color: rgba(245,166,35,0.50); box-shadow: 0 12px 36px rgba(245,166,35,0.14), inset 0 1px 0 rgba(255,255,255,1); }
.glass-card.glass-red    { border-color: rgba(222,53,11,0.45);  box-shadow: 0 12px 36px rgba(222,53,11,0.14), inset 0 1px 0 rgba(255,255,255,1); }
.glass-card.glass-purple { border-color: rgba(138,5,190,0.40);  box-shadow: 0 12px 36px rgba(138,5,190,0.14), inset 0 1px 0 rgba(255,255,255,1); }
.glass-card.glass-blue   { border-color: rgba(6,182,212,0.45);  box-shadow: 0 12px 36px rgba(6,182,212,0.14),  inset 0 1px 0 rgba(255,255,255,1); }

.glass-card.glass-green:hover,
.glass-card.glass-yellow:hover,
.glass-card.glass-red:hover,
.glass-card.glass-purple:hover,
.glass-card.glass-blue:hover {
    transform: translateY(-2px);
}

/* ═══════════════════════════════════════
   NAVEGACIÓN — vidrio
   ═══════════════════════════════════════ */
.nav-glass {
    background: rgba(255,255,255,0.55);
    backdrop-filter: blur(var(--glass-blur-nav)) saturate(1.3);
    -webkit-backdrop-filter: blur(var(--glass-blur-nav)) saturate(1.3);
    border: 1px solid rgba(255,255,255,0.75);
    box-shadow: 0 8px 32px rgba(76,29,116,0.12);
}

header.nav-glass {
    border-left: none;
    border-right: none;
    border-top: none;
    border-radius: 0;
}

/* ═══════════════════════════════════════
   INPUTS — vidrio
   ═══════════════════════════════════════ */
.input-glass {
    background: rgba(255,255,255,0.55);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.85);
    border-radius: 12px;
    color: var(--text-primary);
    transition: border-color 150ms ease-out, box-shadow 150ms ease-out, background 150ms ease-out;
    font-family: 'Inter', system-ui, sans-serif;
}

.input-glass:focus {
    outline: none;
    background: rgba(255,255,255,0.75);
    border-color: var(--nu-purple);
    box-shadow: 0 0 0 3px rgba(138,5,190,0.18), 0 4px 16px rgba(138,5,190,0.12);
}

.input-glass::placeholder {
    color: var(--text-tertiary);
}

/* ═══════════════════════════════════════
   BOTONES
   ═══════════════════════════════════════ */
.btn-primary {
    background: linear-gradient(135deg, #8A05BE 0%, #B845E8 100%);
    border: none;
    color: #FFFFFF;
    font-weight: 600;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 14px;
    border-radius: 12px;
    cursor: pointer;
    box-shadow: 0 4px 18px rgba(138,5,190,0.45), inset 0 1px 0 rgba(255,255,255,0.35);
    transition: filter 150ms ease-out, box-shadow 150ms ease-out, transform 100ms ease-out;
    position: relative;
    overflow: hidden;
}

.btn-primary:hover {
    filter: brightness(1.08);
    box-shadow: 0 8px 28px rgba(138,5,190,0.55), inset 0 1px 0 rgba(255,255,255,0.35);
    transform: translateY(-1px);
}

.btn-primary:active {
    transform: translateY(1px);
    box-shadow: 0 2px 8px rgba(138,5,190,0.40);
}

.btn-primary:disabled {
    opacity: 0.40;
    pointer-events: none;
}

.btn-secondary {
    background: rgba(255,255,255,0.50);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.85);
    color: var(--text-primary);
    font-family: 'Inter', system-ui, sans-serif;
    font-weight: 500;
    border-radius: 12px;
    cursor: pointer;
    box-shadow: 0 2px 12px rgba(76,29,116,0.08);
    transition: border-color 150ms ease-out, background 150ms ease-out, box-shadow 150ms ease-out;
}

.btn-secondary:hover {
    border-color: rgba(138,5,190,0.45);
    background: rgba(138,5,190,0.10);
    color: var(--nu-purple-deep);
    box-shadow: 0 4px 16px rgba(138,5,190,0.16);
}

.btn-danger {
    background: rgba(222,53,11,0.08);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(222,53,11,0.45);
    color: var(--danger);
    font-family: 'Inter', system-ui, sans-serif;
    font-weight: 500;
    border-radius: 12px;
    cursor: pointer;
    transition: background 150ms ease-out, border-color 150ms ease-out, box-shadow 150ms ease-out;
}

.btn-danger:hover {
    background: rgba(222,53,11,0.16);
    border-color: var(--danger);
    box-shadow: 0 4px 16px rgba(222,53,11,0.20);
}

/* ═══════════════════════════════════════
   METRIC CARDS
   ═══════════════════════════════════════ */
.metric-card {
    background: var(--bg-surface);
    backdrop-filter: blur(var(--glass-blur)) saturate(1.4);
    -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.4);
    border: 1.5px solid var(--border-glass);
    border-radius: 18px;
    overflow: hidden;
    transition: border-color 200ms ease-out, box-shadow 200ms ease-out, transform 200ms ease-out;
    position: relative;
    box-shadow: var(--shadow-card);
}

.metric-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-card-hover);
}

/* ═══════════════════════════════════════
   SCROLLBAR
   ═══════════════════════════════════════ */
::-webkit-scrollbar { width: 8px; height: 8px; }

::-webkit-scrollbar-track { background: transparent; }

::-webkit-scrollbar-thumb {
    background: rgba(138,5,190,0.30);
    border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
    background: rgba(138,5,190,0.55);
}

::-webkit-scrollbar-corner { background: transparent; }

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}
input[type=number] { -moz-appearance: textfield; }

/* ═══════════════════════════════════════
   ANIMACIONES
   ═══════════════════════════════════════ */
@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
}

@keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
}

@keyframes slideInFromBottom {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-up  { animation: fadeInUp 0.25s ease-out forwards; }
.animate-fade-in     { animation: fadeIn 0.20s ease-out forwards; }
.animate-slide-up    { animation: slideInFromBottom 0.28s ease-out forwards; }

.delay-100 { animation-delay: 100ms; }
.delay-200 { animation-delay: 200ms; }
.delay-300 { animation-delay: 300ms; }
.delay-400 { animation-delay: 400ms; }
.delay-500 { animation-delay: 500ms; }

/* ═══════════════════════════════════════
   BADGES — píldoras de vidrio tintado
   ═══════════════════════════════════════ */
.badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 12px;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 600;
    font-family: 'Inter', system-ui, sans-serif;
    letter-spacing: 0;
    border: 1px solid transparent;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
}

.badge-success {
    background: rgba(0,168,120,0.14);
    color: #00754F;
    border-color: rgba(0,168,120,0.35);
}

.badge-warning {
    background: rgba(245,166,35,0.16);
    color: #8A5B0F;
    border-color: rgba(245,166,35,0.40);
}

.badge-danger {
    background: rgba(222,53,11,0.12);
    color: #A2270A;
    border-color: rgba(222,53,11,0.35);
}

.badge-info {
    background: rgba(138,5,190,0.12);
    color: var(--nu-purple-deep);
    border-color: rgba(138,5,190,0.35);
}

/* ═══════════════════════════════════════
   MODAL OVERLAY — vidrio profundo
   ═══════════════════════════════════════ */
.modal-overlay {
    background: rgba(40,16,60,0.35);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
}

/* ═══════════════════════════════════════
   TABLA — vidrio
   ═══════════════════════════════════════ */
.table-glass {
    background: var(--bg-surface);
    backdrop-filter: blur(var(--glass-blur)) saturate(1.4);
    -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.4);
    border-radius: 18px;
    border: 1.5px solid var(--border-glass);
    overflow: hidden;
    box-shadow: var(--shadow-card);
}

.table-glass th {
    background: rgba(255,255,255,0.50);
    color: var(--text-secondary);
    font-weight: 600;
    font-family: 'Inter', system-ui, sans-serif;
    text-transform: none;
    font-size: 12px;
    letter-spacing: 0;
    border-bottom: 1px solid rgba(255,255,255,0.75);
}

.table-glass tr {
    border-bottom: 1px solid rgba(124,58,180,0.07);
    transition: background 150ms ease-out;
}

.table-glass tr:hover {
    background: rgba(138,5,190,0.07);
}

.table-glass tr:last-child {
    border-bottom: none;
}

/* ═══════════════════════════════════════
   TEXTO DE COLOR
   ═══════════════════════════════════════ */
.text-accent  { color: var(--nu-purple) !important; }
.text-success { color: var(--success) !important; }
.text-warning { color: #B97A0F !important; }
.text-danger  { color: var(--danger) !important; }
.text-dpurple { color: var(--nu-purple) !important; }
.text-cyan    { color: #0891B2 !important; }

/* ═══════════════════════════════════════
   SELECTION & FOCUS
   ═══════════════════════════════════════ */
::selection {
    background: rgba(138,5,190,0.20);
    color: var(--text-primary);
}

:focus-visible {
    outline: 2px solid var(--nu-purple);
    outline-offset: 2px;
}

.recharts-tooltip-wrapper {
    z-index: 100 !important;
}

/* ═══════════════════════════════════════
   Overrides utilidades Tailwind
   (paneles blanco-translúcido → vidrio)
   ═══════════════════════════════════════ */
.bg-white\/5,
.bg-white\/6,
.bg-white\/8,
.bg-white\/10,
.bg-white\/12 {
    background-color: rgba(255,255,255,0.40) !important;
}

.bg-white\/15,
.bg-white\/20 {
    background-color: rgba(255,255,255,0.55) !important;
}

/* Dentro de tarjetas con gradiente de acento, blancos semitransparentes reales */
.bg-gradient-to-br.from-accent .bg-white\/5,
.bg-gradient-to-br.from-accent .bg-white\/6,
.bg-gradient-to-br.from-accent .bg-white\/8,
.bg-gradient-to-br.from-accent .bg-white\/10,
.bg-gradient-to-br.from-accent .bg-white\/12,
.bg-gradient-to-br.from-accent .bg-white\/15,
.bg-gradient-to-br.from-accent .bg-white\/20,
.bg-gradient-to-br.from-accent .bg-white\/30 {
    background-color: rgba(255,255,255,0.18) !important;
}
.bg-gradient-to-br.from-accent .border-white\/20,
.bg-gradient-to-br.from-accent .border-white\/30,
.bg-gradient-to-br.from-accent .border-white\/50 {
    border-color: rgba(255,255,255,0.30) !important;
}
.bg-gradient-to-br.from-accent .hover\:bg-white\/20:hover,
.bg-gradient-to-br.from-accent .hover\:bg-white\/30:hover,
.bg-gradient-to-br.from-accent .hover\:bg-white\/90:hover {
    background-color: rgba(255,255,255,0.30) !important;
}

/* ═══════════════════════════════════════
   RENDIMIENTO Y FALLBACKS
   ═══════════════════════════════════════ */

/* Móvil: blur reducido (GPU) */
@media (max-width: 768px) {
    :root {
        --glass-blur: 12px;
        --glass-blur-nav: 12px;
    }
}

/* Usuarios con reduce-motion: orbes quietos, sin lift en hover */
@media (prefers-reduced-motion: reduce) {
    .bg-orbs .orb { animation: none !important; }
    .glass-card:hover, .metric-card:hover, .btn-primary:hover { transform: none; }
}

/* Navegadores sin backdrop-filter: superficies casi opacas */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .glass-card, .metric-card, .table-glass {
        background: rgba(255,255,255,0.92);
    }
    .nav-glass, .input-glass, .btn-secondary {
        background: rgba(255,255,255,0.95);
    }
}
```

- [ ] **Step 2: Add the orbs to `<body>`** — right before `<div id="root"></div>`:

```html
    <div class="bg-orbs" aria-hidden="true">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>
    </div>
```

(They sit at `z-index:-1` behind `#root`, so they show through on Login and all views with no React changes.)

- [ ] **Step 3: Build and visual check**

Run: `npm run build`
Expected: success.
Then `npm run dev` and verify in the browser (desktop + mobile width): login screen, dashboard cards (glass + status borders), nav header/bottom nav frosted, modals blurred overlay, Stats charts readable, inputs focus ring.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "style: Glass Maximo Nu reskin — aurora bg, floating orbs, frosted glass surfaces"
```

---

### Task 6: Deploy + end-to-end verification

- [ ] **Step 1: Run the test suite + build one more time**

```bash
node scripts/test-finance-shared.mjs && npm run build
```
Expected: 8 tests pass, build OK.

- [ ] **Step 2: Apply `supabase-rpc.sql` in Supabase**

Preferred: `supabase db query` is not available for remote without link; instead instruct the user (or use psql if available). Practical path: print clear instructions to run `supabase-rpc.sql` in the SQL Editor of project `ougsplrbvypxflyyfojm` BEFORE deploying functions. If the Supabase CLI is authenticated, attempt:
```bash
supabase link --project-ref ougsplrbvypxflyyfojm
# psql path if DATABASE_URL known; otherwise SQL Editor manual step
```

- [ ] **Step 3: Deploy the four Edge Functions**

```bash
supabase functions deploy register-payment --project-ref ougsplrbvypxflyyfojm
supabase functions deploy settle-loan --project-ref ougsplrbvypxflyyfojm
supabase functions deploy create-loan --project-ref ougsplrbvypxflyyfojm
supabase functions deploy update-loan --project-ref ougsplrbvypxflyyfojm
```
Expected: each reports deployed. (`_shared/` is bundled automatically by the CLI.)

**ORDER MATTERS:** RPCs must exist before the new functions take traffic. Deploy functions only after Step 2 confirms the SQL ran.

- [ ] **Step 4: Manual end-to-end verification (npm run dev)**

1. Login renders glass + orbs; password gate works.
2. Dashboard: cards show glass with green/yellow/red borders.
3. Register an interest payment on a test loan → toast OK, card updates instantly (no full reload flash), Movimientos shows the tx.
4. Register a capital payment → capital drops instantly.
5. Double-click the pay button rapidly → second request rejected with "Pago duplicado…".
6. Settle a small test loan → moves to settled, total matches server.
7. Create a loan with capital 0 → clean 400 error toast.
8. Realtime: open the app in a second tab, register a payment in tab 1 → tab 2 updates without full refetch.

- [ ] **Step 5: Final commit + push**

```bash
git push origin main
```

---

## Self-review notes

- Spec coverage: Sección 1 → Task 5; Sección 2a → Task 2; 2b → Tasks 1+3; 2c → Task 3; 2d → Task 3 Step 1; Sección 3 → Task 4; verificación → Task 6. ✔
- `pendingInterest` removed from client request: `register-payment` no longer requires it (Task 3 Step 2) and `RegisterPaymentParams` drops it (Task 4 Step 1). Old clients sending it are unaffected (extra body fields ignored). ✔
- Type consistency: `computeInterestState` / `calculatePendingInterest` / `anniversaryFromStartUTC` / `getGeneratedPeriodsUTC` names match across Tasks 1, 3, 4. RPC names `register_payment_atomic` / `settle_loan_atomic` match between Tasks 2 and 3. ✔
- Settled-loan summaries: `calculateLoanSummary` runs on settled loans too (history view); the 'PAGO DE LIQUIDACIÓN TOTAL' description falls through silently in the shared core (no warn), same numeric behavior as before. ✔
