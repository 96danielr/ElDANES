// Edge Function: Registrar pago
// Maneja el registro de pagos y actualización de capital de forma atómica
// paymentType: 'interest' (solo interés), 'capital' (solo capital), 'mixed' (interés primero, sobrante a capital)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { loanId, amount, pendingInterest, paymentType } = await req.json();

    if (!loanId || amount === undefined || pendingInterest === undefined) {
      return new Response(
        JSON.stringify({ error: 'loanId, amount y pendingInterest son requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtener préstamo
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      return new Response(
        JSON.stringify({ error: 'Préstamo no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calcular distribución según tipo de pago
    let payToInterest = 0;
    let payToCapital = 0;
    let description = '';

    const type = paymentType || 'mixed';

    if (type === 'interest') {
      // Todo a interés, no toca capital
      payToInterest = amount;
      payToCapital = 0;
      description = 'Pago Intereses';
    } else if (type === 'capital') {
      // Todo reduce capital, no toca interés
      payToInterest = 0;
      payToCapital = amount;
      description = 'Abono a Capital';
    } else {
      // Mixto: primero interés, sobrante a capital
      payToInterest = Math.min(amount, pendingInterest);
      payToCapital = amount - payToInterest;
      if (payToCapital > 0 && payToInterest > 0) {
        description = 'Abono Mixto (Int + Cap)';
      } else if (payToCapital > 0) {
        description = 'Abono a Capital';
      } else {
        description = 'Pago Intereses';
      }
    }

    // Registrar transacción
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        loanid: loanId,
        amount: amount,
        date: Date.now(),
        description
      });

    if (transactionError) {
      return new Response(
        JSON.stringify({ error: 'Error al registrar transacción', details: transactionError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Si hay abono a capital, actualizar préstamo
    if (payToCapital > 0) {
      const newCapitalValue = Math.max(0, Number(loan.currentcapital) - payToCapital);

      const { data: updatedLoan, error: updateError } = await supabase
        .from('loans')
        .update({ currentcapital: newCapitalValue })
        .eq('id', loanId)
        .select()
        .single();

      if (updateError) {
        return new Response(
          JSON.stringify({ error: 'Error al actualizar capital', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: payToInterest > 0
            ? `Pago registrado: ${payToInterest} a interés, ${payToCapital} a capital`
            : `Abono a capital registrado: -${payToCapital}`,
          loan: updatedLoan,
          payToInterest,
          payToCapital
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Pago de intereses registrado',
        payToInterest,
        payToCapital: 0
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
