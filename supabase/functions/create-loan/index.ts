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

    const { clientId, capital, rate, customStartDate, existingLoanId, hasLetra } = await req.json();

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

      // Solo currentcapital: initialcapital es el capital ORIGINAL del préstamo.
      // La simulación de interés ya suma la inyección al procesar su transacción;
      // inflar initialcapital haría doble conteo (sobrecobro en meses pasados).
      const { data: updatedLoan, error: updateError } = await supabase
        .from('loans')
        .update({
          currentcapital: Number(existingLoan.currentcapital) + numCapital,
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
        hasletra: Boolean(hasLetra),
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
