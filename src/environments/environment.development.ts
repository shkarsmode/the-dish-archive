// Local development environment. Point apiUrl at a locally-running backend
// (`npm run start:dev` in the-dish-archive-back → http://localhost:3000/api) or
// keep the deployed backend for a quick front-only dev loop.
export const environment = {
    production: false,
    apiUrl: 'https://the-dish-archive-back.vercel.app/api',
};
