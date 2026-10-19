/**
 * Application macOS de proce55us (l'Atelier prompts webcam).
 * Affiche l'application web construite (dossier app/) dans une fenêtre,
 * servie par un petit serveur local qui remplace le serveur Vite (server.js).
 */
import {
  app,
  BrowserWindow,
  session,
  shell,
  systemPreferences,
} from "electron";
import path from "node:path";
import { startServer } from "./server.js";
import { checkForUpdates } from "./updater.js";

// Une seule instance : relancer l'app remet simplement la fenêtre au premier plan
if (!app.requestSingleInstanceLock()) app.quit();

let window = null;

app.on("second-instance", () => {
  if (window?.isMinimized()) window.restore();
  window?.focus();
});

app.whenReady().then(async () => {
  const url = await startServer(path.join(app.getAppPath(), "app"));
  allowCamera(url);

  window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "proce55us",
    backgroundColor: "#ffffff",
  });
  openLinksInBrowser(window, url);
  // La fenêtre garde le nom de l'app, pas le <title> de la page web
  // (preventDefault ne suffit pas quand le titre vient de document.title)
  window.webContents.on("page-title-updated", (event) => {
    event.preventDefault();
    window.setTitle("proce55us");
  });
  // Capsule « Nouvelle version » si une release plus récente existe
  checkForUpdates(window);
  window.loadURL(url);
  window.on("closed", () => (window = null));
});

app.on("window-all-closed", () => app.quit());

/**
 * La caméra est autorisée pour l'application elle-même (et l'aperçu en iframe) :
 * macOS demande l'accès une seule fois, à la première utilisation.
 */
function allowCamera(appUrl) {
  const fromApp = (origin) => !origin || origin === appUrl || origin === "null";
  session.defaultSession.setPermissionCheckHandler(
    (_contents, permission, origin) =>
      permission === "media" && fromApp(origin),
  );
  session.defaultSession.setPermissionRequestHandler(
    async (_contents, permission, callback, details) => {
      const wantsVideo = details.mediaTypes?.includes("video");
      if (
        permission !== "media" ||
        !wantsVideo ||
        details.mediaTypes.includes("audio")
      )
        return callback(false);
      callback(await systemPreferences.askForMediaAccess("camera"));
    },
  );
}

/** Les liens externes (ex. « Obtenir une clé ») s'ouvrent dans le navigateur par défaut. */
function openLinksInBrowser(window, appUrl) {
  const external = (url) => /^https?:/.test(url) && !url.startsWith(appUrl);
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (external(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (!external(url)) return;
    event.preventDefault();
    shell.openExternal(url);
  });
}
