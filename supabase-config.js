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

const SUPABASE_URL = 'https://poxpogybhlsrwgnmtvsc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBveHBvZ3liaGxzcndnbm10dnNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTIwNzEsImV4cCI6MjA3ODY2ODA3MX0.0TNcta7uR7QmRiNLeuio_PiywaO5Ly-0k8x6USLiBRM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    redirectTo: 'com.electron.todolist://auth/callback',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

module.exports = { supabase };

