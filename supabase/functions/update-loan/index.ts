// Edge Function: Actualizar préstamo
// Permite modificar tasa de interés y etiqueta (owner) del préstamo.
// El capital NO se puede editar desde aquí.

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

    const body = await req.json();
    const { loanId, monthlyrate, owner, hasletra } = body;

    if (!loanId) {
      return jsonResponse({ error: 'loanId es requerido' }, 400);
    }

    // Bloquear edición directa de capital. El capital solo se modifica vía
    // register-payment (Abono a Capital) o create-loan (Inyección).
    if (body.currentcapital !== undefined || body.initialcapital !== undefined) {
      return jsonResponse({
        error: 'No se permite modificar capital desde update-loan. Usar Abono a Capital o Inyección de Capital.'
      }, 400);
    }

    if (monthlyrate !== undefined) {
      const numRate = Number(monthlyrate);
      if (!Number.isFinite(numRate) || numRate <= 0) {
        return jsonResponse({ error: 'La tasa debe ser un número mayor a 0' }, 400);
      }
    }

    if (hasletra !== undefined && typeof hasletra !== 'boolean') {
      return jsonResponse({ error: 'hasletra debe ser booleano' }, 400);
    }

    // Obtener préstamo actual
    const { data: existingLoan, error: loanError } = await supabase
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .single();

    if (loanError || !existingLoan) {
      return jsonResponse({ error: 'Préstamo no encontrado' }, 404);
    }

    // Construir objeto de actualización solo con los campos proporcionados
    const updateData: Record<string, unknown> = {};
    if (monthlyrate !== undefined) updateData.monthlyrate = monthlyrate;
    if (owner !== undefined) updateData.owner = owner;
    if (hasletra !== undefined) updateData.hasletra = hasletra;

    if (Object.keys(updateData).length === 0) {
      return jsonResponse({ error: 'No se proporcionaron campos para actualizar' }, 400);
    }

    // Actualizar préstamo
    const { data: updatedLoan, error: updateError } = await supabase
      .from('loans')
      .update(updateData)
      .eq('id', loanId)
      .select()
      .single();

    if (updateError) {
      return jsonResponse({ error: 'Error al actualizar préstamo', details: updateError.message }, 500);
    }

    return jsonResponse({
      success: true,
      message: 'Préstamo actualizado correctamente',
      loan: updatedLoan
    });
  } catch (error) {
    return jsonResponse({ error: 'Error interno del servidor', details: error.message }, 500);
  }
});
