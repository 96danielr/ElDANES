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
  -- Tolerancia 0.01: el split viene de aritmética de punto flotante en JS.
  if p_interest_paid < 0 or p_capital_reduction < 0
     or abs((p_interest_paid + p_capital_reduction) - p_amount) > 0.01 then
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
  -- Cero permitido: un crédito totalmente pagado se cierra sin cobro,
  -- registrando la transacción de cierre por $0 para el historial.
  if p_amount is null or p_amount < 0 then
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
