/**
 * Services proposés dans les Réglages pour générer le code.
 * Chaque baseUrl vient de endpoints.js (route du proxy, ou adresse directe en version web).
 * Les offres « gratuit » ne demandent pas de carte bancaire (limites d'usage).
 */
import { LlmClient, GeminiClient } from "./LlmClient.js";
import { t } from "../i18n/index.js";
import { endpoint } from "./endpoints.js";

export const providers = [
  {
    id: "lmstudio",
    group: t("settings.group.default"),
    label: "LM Studio",
    note: t("provider.lmstudio.note"),
    name: "LM Studio",
    client: LlmClient,
  },
  {
    id: "gemini",
    group: t("settings.group.free"),
    label: "Gemini 3.8 Flash",
    note: t("provider.gemini.note"),
    name: "Google AI Studio",
    client: GeminiClient,
    baseUrl: endpoint("gemini"),
    path: "/v1beta/models",
    model: "gemini-3.8-flash",
    keyUrl: "https://aistudio.google.com/apikey",
  },
  {
    id: "groq",
    group: t("settings.group.free"),
    label: "GPT-OSS 120B",
    note: t("provider.groq.note"),
    name: "Groq",
    client: LlmClient,
    baseUrl: endpoint("groq"),
    model: "openai/gpt-oss-120b",
    keyUrl: "https://console.groq.com/keys",
  },
  {
    id: "mistral",
    group: t("settings.group.free"),
    label: "Mistral Small",
    note: t("provider.mistral.note"),
    name: "Mistral",
    client: LlmClient,
    baseUrl: endpoint("mistral"),
    model: "mistral-small-latest",
    keyUrl: "https://console.mistral.ai/api-keys",
  },
  {
    id: "openrouter",
    group: t("settings.group.free"),
    label: t("provider.openrouter.label"),
    note: t("provider.openrouter.note"),
    name: "OpenRouter",
    client: LlmClient,
    baseUrl: endpoint("openrouter"),
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
