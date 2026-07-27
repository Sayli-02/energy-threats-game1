// Supabase Client Initialization
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://kxdfrxnuimpgldikcpzl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4ZGZyeG51aW1wZ2xkaWtjcHpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNjg5NzAsImV4cCI6MjEwMDc0NDk3MH0.ngmm6yB8TpJobzPCemagfzIDCmgjvgzWY3iF16QmLOs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
