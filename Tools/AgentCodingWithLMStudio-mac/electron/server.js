/**
 * Petit serveur local qui remplace le serveur Vite dans l'application :
 * - sert l'application web construite (dossier app/) ;
 * - relaie les mêmes routes que vite.config.js vers les services de génération
 *   (évite les problèmes de CORS, sans modifier le code de l'application web).
 * Il n'écoute que sur 127.0.0.1 : il n'est pas accessible depuis le réseau.
 */
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

// À garder identique à TARGETS dans ../AgentCodingWithLMStudio/src/llm/endpoints.js
const ROUTES = {
  "/lmstudio": process.env.LMSTUDIO_URL || "http://localhost:1234",
  "/gemini": "https://generativelanguage.googleapis.com",
  "/groq": "https://api.groq.com/openai",
  "/mistral": "https://api.mistral.ai",
  "/openrouter": "https://openrouter.ai/api",
};

// Port fixe : l'origine reste la même d'un lancement à l'autre,
// donc les réglages (localStorage) sont conservés
const PREFERRED_PORT = 41730;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

// En-têtes recalculés par fetch ou devenus faux après décompression
const SKIPPED_REQUEST_HEADERS = [
  "host",
  "connection",
  "content-length",
  "origin",
  "referer",
];
const SKIPPED_RESPONSE_HEADERS = [
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
];

/** Démarre le serveur et renvoie son adresse (http://127.0.0.1:port). */
export async function startServer(root) {
  const server = http.createServer((request, response) => {
    const route = Object.keys(ROUTES).find(
      (prefix) =>
        request.url === prefix || request.url.startsWith(`${prefix}/`),
    );
    const handle = route
      ? relay(
          request,
          response,
          ROUTES[route] + request.url.slice(route.length),
        )
      : serveFile(root, request, response);
    handle.catch((error) => {
      console.error(error);
      // Comme le proxy Vite : un 5xx signale un service injoignable
      if (!response.headersSent) response.writeHead(502);
      response.end();
    });
  });
  const port = await listen(server, PREFERRED_PORT).catch(() =>
    listen(server, 0),
  );
  return `http://127.0.0.1:${port}`;
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject);
      resolve(server.address().port);
    });
  });
}

async function serveFile(root, request, response) {
  const { pathname } = new URL(request.url, "http://localhost");
  // On reste dans le dossier de l'application
  const file = path.join(root, path.normalize(decodeURIComponent(pathname)));
  if (!file.startsWith(root)) return response.writeHead(403).end();
  const target = pathname.endsWith("/") ? path.join(file, "index.html") : file;
  const body = await readFile(target).catch(() => null);
  if (!body) return response.writeHead(404).end();
  response.writeHead(200, {
    "Content-Type": TYPES[path.extname(target)] ?? "application/octet-stream",
  });
  response.end(body);
}

async function relay(request, response, url) {
  const headers = Object.fromEntries(
    Object.entries(request.headers).filter(
      ([name]) => !SKIPPED_REQUEST_HEADERS.includes(name),
    ),
  );
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const upstream = await fetch(url, {
    method: request.method,
    headers,
    body: chunks.length ? Buffer.concat(chunks) : undefined,
  });
  response.writeHead(
    upstream.status,
    Object.fromEntries(
      [...upstream.headers].filter(
        ([name]) => !SKIPPED_RESPONSE_HEADERS.includes(name),
      ),
    ),
  );
  // Transmis au fur et à mesure : le code généré s'affiche en direct
  if (upstream.body) Readable.fromWeb(upstream.body).pipe(response);
  else response.end();
}
