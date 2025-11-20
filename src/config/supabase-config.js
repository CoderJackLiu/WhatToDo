// Suppress Supabase Node.js version warning to avoid console clutter
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  // Filter out Supabase Node.js deprecation warnings
  if (args[0] && typeof args[0] === 'string' && args[0].includes('Node.js 18 and below are deprecated')) {
    return; // Ignore this warning
  }
  originalConsoleWarn.apply(console, args);
};

const { createClient } = require('@supabase/supabase-js');

// Restore original console.warn after import
console.warn = originalConsoleWarn;

const SUPABASE_URL = 'https://sbp-vbbjm5so9tgqif2o.supabase.opentrust.net';
const SUPABASE_ANON_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiIsInJlZiI6InNicC12YmJqbTVzbzl0Z3FpZjJvIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NjM2MTc4OTEsImV4cCI6MjA3OTE5Mzg5MX0.SbxadtwQ3dihwYiLzApl_odCEOCWuucLPBzDLKhqRj0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    redirectTo: 'com.electron.todolist://auth/callback',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

module.exports = { supabase };

