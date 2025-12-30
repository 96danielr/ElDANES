
import { createClient } from '@supabase/supabase-js';

// El SDK de Supabase maneja CORS, headers y auth automáticamente
// NO usar fetch manual - el cliente maneja todo internamente
const supabaseUrl = 'https://ougsplrbvypxflyyfojm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91Z3NwbHJidnlweGZseXlmb2ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMDM5MzEsImV4cCI6MjA4MjY3OTkzMX0._eNbqQ8S5uaJbgxpo2WtY_U9OgaKyMV7etpVzifd2j4';

export const supabase = createClient(supabaseUrl, supabaseKey);
