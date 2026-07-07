// Production environment.
// supabaseAnonKey is the PUBLIC anon key — safe to ship in the client bundle.
// The service-role key must NEVER appear here; it lives only in server-side secrets.
export const environment = {
    production: true,
    supabaseUrl: '',
    supabaseAnonKey: '',
    // Legacy NestJS API, kept only during the Supabase migration transition.
    legacyApiUrl: 'https://the-dish-archive-back.vercel.app',
};
