import { defineConfig, loadEnv } from "vite";

/**
 * Le navigateur appelle /lmstudio/… (ou /groq/…, etc.) et Vite relaie vers le
 * service correspondant. Cela évite les problèmes de CORS.
 * L'adresse de LM Studio se change avec LMSTUDIO_URL (.env).
 * Les services en ligne sont choisis dans les Réglages (src/llm/providers.js).
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const relay = (target) => ({
    target,
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/[^/]+/, ""),
  });
  const proxy = {
    "/lmstudio": relay(env.LMSTUDIO_URL || "http://localhost:1234"),
    "/gemini": relay("https://generativelanguage.googleapis.com"),
    "/groq": relay("https://api.groq.com/openai"),
    "/mistral": relay("https://api.mistral.ai"),
    "/openrouter": relay("https://openrouter.ai/api"),
  };
  return { server: { proxy }, preview: { proxy } };
});
