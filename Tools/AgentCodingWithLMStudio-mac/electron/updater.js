/**
 * Vérification des mises à jour : compare la version de l'app à la dernière
 * release GitHub et, s'il y en a une plus récente, affiche une petite capsule
 * en haut à droite de la fenêtre (« Télécharger » ouvre le .dmg dans le navigateur).
 *
 * Pas de mise à jour automatique : elle exige une signature Apple Developer ID.
 * La capsule est injectée par Electron (Shadow DOM) : l'application web n'est
 * pas modifiée, et rien n'apparaît dans sa version navigateur.
 * « × » masque la capsule pour cette version (mémorisé dans userData/updater.json).
 */
import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

const REPO = "gaelhugo/ECAL_MID_1_2027";
const LATEST = `https://api.github.com/repos/${REPO}/releases/latest`;
const DOWNLOAD = `https://github.com/${REPO}/releases/latest/download/proce55us-universal.dmg`;
const INTERVAL = 6 * 60 * 60 * 1000; // nouvelle vérification toutes les 6 h

const stateFile = () => path.join(app.getPath("userData"), "updater.json");
const readState = () => {
  try {
    return JSON.parse(fs.readFileSync(stateFile(), "utf8"));
  } catch {
    return {};
  }
};

/** Vrai si la version a est plus récente que b ("1.10.0" > "1.9.2"). */
export function isNewer(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}

/** Lance la vérification pour cette fenêtre (au chargement, puis périodiquement). */
export function checkForUpdates(window) {
  let update = null; // { version, url } de la release plus récente
  let hidden = false; // capsule fermée ou « Télécharger » cliqué pendant cette session

  const check = async () => {
    try {
      const response = await fetch(LATEST, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (!response.ok) return;
      const release = await response.json();
      const version = String(release.tag_name ?? "").replace(/^v/, "");
      if (!/^\d+\.\d+\.\d+$/.test(version)) return;
      if (!isNewer(version, app.getVersion())) return;
      if (readState().dismissed === version) return;
      update = { version, url: release.html_url };
      show();
    } catch {
      // hors ligne ou API indisponible : on réessaiera plus tard
    }
  };

  const show = async () => {
    if (!update || hidden || window.isDestroyed()) return;
    try {
      const action = await window.webContents.executeJavaScript(
        capsule(update.version, update.url),
      );
      hidden = true;
      if (action === "dismiss")
        fs.writeFileSync(
          stateFile(),
          JSON.stringify({ dismissed: update.version }),
        );
    } catch {
      // la page a été rechargée : la capsule sera réaffichée par did-finish-load
    }
  };

  window.webContents.on("did-finish-load", () => (update ? show() : check()));
  const timer = setInterval(check, INTERVAL);
  window.on("closed", () => clearInterval(timer));
}

/**
 * Code injecté dans la page : crée la capsule et renvoie une promesse,
 * résolue par "download" ou "dismiss" selon le clic.
 */
function capsule(version, notesUrl) {
  return `new Promise((resolve) => {
  document.getElementById("proce55us-update")?.remove();
  const host = document.createElement("div");
  host.id = "proce55us-update";
  const root = host.attachShadow({ mode: "closed" });
  root.innerHTML = \`<style>
    .capsule {
      position: fixed; top: 14px; right: 64px; z-index: 2147483647;
      display: flex; align-items: center; gap: 10px;
      padding: 6px 6px 6px 14px; border-radius: 999px;
      background: #1d1d1f; color: #fff;
      font: 500 13px/1 -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif;
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.22);
      animation: in 0.35s ease;
    }
    @keyframes in { from { opacity: 0; transform: translateY(-8px); } }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #ffd60a; }
    .label { color: #fff; text-decoration: none; }
    .label:hover { text-decoration: underline; }
    .download {
      padding: 6px 12px; border-radius: 999px; text-decoration: none;
      background: #ffd60a; color: #1d1d1f; font-weight: 600;
    }
    .download:hover { background: #ffe14d; }
    .close {
      width: 24px; height: 24px; border: 0; border-radius: 50%; padding: 0;
      background: transparent; color: rgba(255, 255, 255, 0.6);
      font: inherit; font-size: 16px; cursor: pointer;
    }
    .close:hover { background: rgba(255, 255, 255, 0.12); color: #fff; }
  </style>
  <div class="capsule" role="status">
    <span class="dot"></span>
    <a class="label" target="_blank" title="Voir les nouveautés"></a>
    <a class="download" target="_blank">Télécharger</a>
    <button class="close" title="Masquer jusqu’à la prochaine version">×</button>
  </div>\`;
  const label = root.querySelector(".label");
  label.textContent = "Nouvelle version " + ${JSON.stringify(version)};
  label.href = ${JSON.stringify(notesUrl)};
  root.querySelector(".download").href = ${JSON.stringify(DOWNLOAD)};
  // Retrait différé : un lien retiré pendant le clic n'ouvrirait plus sa page
  const done = (action) => setTimeout(() => { host.remove(); resolve(action); });
  root.querySelector(".download").addEventListener("click", () => done("download"));
  root.querySelector(".close").addEventListener("click", () => done("dismiss"));
  document.body.append(host);
})`;
}
