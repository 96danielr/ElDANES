// Edge Function: Actualizar préstamo
// Permite modificar tasa de interés, capital y otros campos del préstamo

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

    const { loanId, monthlyrate, currentcapital, initialcapital, owner } = await req.json();

    if (!loanId) {
      return new Response(
        JSON.stringify({ error: 'loanId es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtener préstamo actual
    const { data: existingLoan, error: loanError } = await supabase
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .single();

    if (loanError || !existingLoan) {
      return new Response(
        JSON.stringify({ error: 'Préstamo no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construir objeto de actualización solo con los campos proporcionados
    const updateData: any = {};
    if (monthlyrate !== undefined) updateData.monthlyrate = monthlyrate;
    if (currentcapital !== undefined) updateData.currentcapital = currentcapital;
    if (initialcapital !== undefined) updateData.initialcapital = initialcapital;
    if (owner !== undefined) updateData.owner = owner;

    if (Object.keys(updateData).length === 0) {
      return new Response(
        JSON.stringify({ error: 'No se proporcionaron campos para actualizar' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Actualizar préstamo
    const { data: updatedLoan, error: updateError } = await supabase
      .from('loans')
      .update(updateData)
      .eq('id', loanId)
      .select()
      .single();

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Error al actualizar préstamo', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Préstamo actualizado correctamente',
        loan: updatedLoan
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


