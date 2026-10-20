import { defineConfig, loadEnv } from "vite";
import { TARGETS } from "./src/llm/endpoints.js";

/**
 * Le navigateur appelle /lmstudio/… (ou /groq/…, etc.) et Vite relaie vers le
 * service correspondant. Cela évite les problèmes de CORS.
 * L'adresse de LM Studio se change avec LMSTUDIO_URL (.env).
 * Les services en ligne sont choisis dans les Réglages (src/llm/providers.js),
 * leurs adresses sont dans src/llm/endpoints.js.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const relay = (target) => ({
    target,
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/[^/]+/, ""),
  });
  const targets = {
    ...TARGETS,
    lmstudio: env.LMSTUDIO_URL || TARGETS.lmstudio,
  };
  const proxy = Object.fromEntries(
    Object.entries(targets).map(([id, target]) => [`/${id}`, relay(target)]),
  );
  return { server: { proxy }, preview: { proxy } };
});
