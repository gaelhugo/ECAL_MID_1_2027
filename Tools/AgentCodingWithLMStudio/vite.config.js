import { defineConfig, loadEnv } from 'vite';

/**
 * Le navigateur appelle /lmstudio/… et Vite relaie vers le serveur LM Studio.
 * Cela évite les problèmes de CORS. L'adresse se change avec LMSTUDIO_URL (.env).
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxy = {
    '/lmstudio': {
      target: env.LMSTUDIO_URL || 'http://localhost:1234',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/lmstudio/, ''),
    },
  };
  return { server: { proxy }, preview: { proxy } };
});
