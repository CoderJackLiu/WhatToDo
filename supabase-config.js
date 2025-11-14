const { createClient } = require('@supabase/supabase-js');

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

