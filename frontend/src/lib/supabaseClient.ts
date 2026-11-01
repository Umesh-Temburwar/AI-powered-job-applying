import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://zhazioldgvjwodzjurzy.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoYXppb2xkZ3Zqd29kemp1cnp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0MjQwMTksImV4cCI6MjEwOTAwMDAxOX0.68-yxr1y8CnxlIKPVdM-FwBOjKo6HnjQysliFLGchuw';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  DEFAULT_SUPABASE_URL;

const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  DEFAULT_SUPABASE_ANON_KEY;

// Validate whether real credentials are provided or still placeholders
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseKey &&
    !supabaseUrl.includes('your-project') &&
    !supabaseKey.includes('your-anon-key') &&
    !supabaseKey.includes('YOUR_')
);

export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  }
);

