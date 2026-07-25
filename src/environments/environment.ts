// Production environment. The app now talks to our own NestJS API (Supabase removed).
export const environment = {
    production: true,
    // NestJS backend base URL (global 'api' prefix included).
    apiUrl: 'https://the-dish-archive-back.vercel.app/api',
};
