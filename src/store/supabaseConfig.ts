export const supabaseUrl=String(import.meta.env.VITE_SUPABASE_URL??'').trim();
export const supabasePublishableKey=String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY??'').trim();
export const supabaseConfigured=!!supabaseUrl&&!!supabasePublishableKey;
