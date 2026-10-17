/**
 * Services proposés dans les Réglages pour générer le code.
 * Chaque baseUrl correspond à un proxy déclaré dans vite.config.js.
 * Les offres « gratuit » ne demandent pas de carte bancaire (limites d'usage).
 */
import { LlmClient, GeminiClient } from "./LlmClient.js";

export const providers = [
  {
    id: "lmstudio",
    group: "Par défaut",
    label: "LM Studio",
    note: "Local, sur cet ordinateur · aucune clé",
    name: "LM Studio",
    client: LlmClient,
  },
  {
    id: "gemini",
    group: "Gratuit",
    label: "Gemini 3.8 Flash",
    note: "Google AI Studio · gratuit",
    name: "Google AI Studio",
    client: GeminiClient,
    baseUrl: "/gemini",
    path: "/v1beta/models",
    model: "gemini-3.8-flash",
    keyUrl: "https://aistudio.google.com/apikey",
  },
  {
    id: "groq",
    group: "Gratuit",
    label: "GPT-OSS 120B",
    note: "Groq · gratuit, 1 000 requêtes/jour",
    name: "Groq",
    client: LlmClient,
    baseUrl: "/groq",
    model: "openai/gpt-oss-120b",
    keyUrl: "https://console.groq.com/keys",
  },
  {
    id: "mistral",
    group: "Gratuit",
    label: "Mistral Small",
    note: "Mistral · gratuit (mode Free)",
    name: "Mistral",
    client: LlmClient,
    baseUrl: "/mistral",
    model: "mistral-small-latest",
    keyUrl: "https://console.mistral.ai/api-keys",
  },
  {
    id: "openrouter",
    group: "Gratuit",
    label: "Modèles gratuits",
    note: "OpenRouter · gratuit, 50 requêtes/jour",
    name: "OpenRouter",
    client: LlmClient,
    baseUrl: "/openrouter",
    model: "openrouter/free",
    keyUrl: "https://openrouter.ai/keys",
  },
];

/** Crée le client d'un service, avec sa clé API éventuelle. */
export function createClient(
  { id, client: Client, name, baseUrl, path, model },
  apiKey = "",
) {
  // LM Studio garde son modèle par défaut (.env ou modèle chargé)
  if (id === "lmstudio") return new Client();
  return new Client({ name, baseUrl, path, model, apiKey, requiresKey: true });
}
