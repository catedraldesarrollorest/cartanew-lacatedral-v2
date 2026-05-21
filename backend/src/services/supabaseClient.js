const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️  Missing Supabase credentials - API will fail');
  console.warn('   SUPABASE_URL:', supabaseUrl ? '✓ set' : '✗ missing');
  console.warn('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓ set' : '✗ missing');
}

// Create client with defaults to prevent initialization error
const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || 'placeholder-key'
);

module.exports = supabase;
