/**
 * Client minimal pour LM Studio (API compatible OpenAI), via le proxy Vite.
 * Le modèle utilisé est VITE_LMSTUDIO_MODEL (.env) ou, à défaut,
 * le modèle actuellement chargé dans LM Studio.
 */
const UNREACHABLE =
  "Impossible de joindre LM Studio. Lancez le serveur local (port 1234) et chargez un modèle.";
const NO_PROXY =
  "Le proxy /lmstudio n'est pas actif : relancez « npm run dev » pour charger vite.config.js.";

export class LlmClient {
  #model = import.meta.env?.VITE_LMSTUDIO_MODEL;

  constructor(baseUrl = "/lmstudio") {
    this.baseUrl = baseUrl;
  }

  /** Envoie les messages et renvoie le texte de la réponse morceau par morceau. */
  async *stream(messages) {
    const response = await this.#request("/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: await this.#getModel(),
        messages,
        temperature: 0.2,
        stream: true,
      }),
    });

    // Réponse en « server-sent events » : des lignes "data: {...}"
    const reader = response.body
      .pipeThrough(new TextDecoderStream())
      .getReader();
    let buffer = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return;
      const lines = (buffer + value).split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        const data = line.replace(/^data:\s*/, "").trim();
        if (!line.startsWith("data:") || data === "[DONE]") continue;
        // Seul le contenu final compte (le raisonnement éventuel est ignoré)
        const delta = JSON.parse(data).choices?.[0]?.delta?.content;
        if (delta) yield delta;
      }
    }
  }

  /** Modèle imposé par .env, sinon le premier modèle de discussion chargé. */
  async #getModel() {
    if (this.#model) return this.#model;
    const { data = [] } = await (await this.#request("/api/v0/models")).json();
    const chat = data.filter((model) => model.type !== "embeddings");
    const model = chat.find((m) => m.state === "loaded") ?? chat[0];
    if (!model) throw new Error("Aucun modèle disponible dans LM Studio.");
    return model.id;
  }

  async #request(path, options) {
    const response = await fetch(this.baseUrl + path, options).catch(
      () => null,
    );
    // Le proxy Vite répond 5xx quand LM Studio n'est pas lancé
    if (!response || response.status >= 500) throw new Error(UNREACHABLE);
    if (!response.ok)
      throw new Error(
        `LM Studio (${response.status}) : ${await response.text()}`,
      );
    // Une page HTML signifie que le proxy /lmstudio n'est pas actif
    if (response.headers.get("content-type")?.includes("text/html"))
      throw new Error(NO_PROXY);
    return response;
  }
}
