import { createClient } from '@supabase/supabase-js';

// Remplacez ces valeurs par vos clés de projet Supabase
const supabaseUrl = 'https://jvqviqvlmlhxqvmejntd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2cXZpcXZsbWxoeHF2bWVqbnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMzIzODksImV4cCI6MjEwNjYwODM4OX0.O3krF-QnMH2FKryJlL8pwTnxm5nc1l4IKm8jiF70_z8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
