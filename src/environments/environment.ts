// Production environment.
// supabaseAnonKey is the PUBLIC anon key — safe to ship in the client bundle.
// The service-role key must NEVER appear here; it lives only in server-side secrets.
export const environment = {
    production: true,
    supabaseUrl: 'https://nhlowpkthulxxkmxuomh.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5obG93cGt0aHVseHhrbXh1b21oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0MjA3ODQsImV4cCI6MjA5ODk5Njc4NH0.ALXhA-OgAjC3KpdgKBMeJVVCtYYKNzk1E-94x7Ur7J4',
    // Legacy NestJS API, kept only during the Supabase migration transition.
    legacyApiUrl: 'https://the-dish-archive-back.vercel.app',
};
