import { supabaseClient } from './supabase.client.js';
import { supabaseAdminClient } from './supabase.admin.js';

export { supabaseClient, supabaseAdminClient };
export const supabaseAdmin = supabaseAdminClient;
export const supabaseAnon = supabaseClient;
