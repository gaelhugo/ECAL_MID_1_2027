/**
 * Adresses des services de génération.
 * - En local (npm run dev) et dans l'app macOS : le navigateur appelle /lmstudio, /groq…
 *   et un proxy relaie (vite.config.js, ../AgentCodingWithLMStudio-mac/electron/server.js).
 * - Version web publiée (VITE_DIRECT_API=1, voir deploy-web.sh) : pas de proxy sur
 *   GitHub Pages, le navigateur appelle directement les services (ils acceptent le CORS ;
 *   pour LM Studio, il faut activer « Enable CORS » dans ses réglages serveur).
 *   127.0.0.1 est utilisé plutôt que localhost : mieux toléré par Chrome
 *   (Local Network Access), et sans targetAddressSpace qui bloque la requête.
 */
export const TARGETS = {
  lmstudio: "http://localhost:1234",
  gemini: "https://generativelanguage.googleapis.com",
  groq: "https://api.groq.com/openai",
  mistral: "https://api.mistral.ai",
  openrouter: "https://openrouter.ai/api",
};

export const DIRECT_API = import.meta.env?.VITE_DIRECT_API === "1";

// En version web, 127.0.0.1 passe mieux que localhost (voir note d'en-tête)
const WEB_TARGETS = { ...TARGETS, lmstudio: "http://127.0.0.1:1234" };

/** Adresse de base d'un service : directe (version web) ou route du proxy. */
export const endpoint = (id) => (DIRECT_API ? WEB_TARGETS[id] : `/${id}`);
