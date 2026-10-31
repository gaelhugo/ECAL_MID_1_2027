/**
 * Point d'entrée : assemble les différentes pièces de l'application.
 */
import "./styles/index.css";
import {
  examples,
  defaultExample,
  registerExample,
  registerImported,
  unregisterExample,
  syncRemoteExamples,
} from "./examples/index.js";
import { Preview } from "./preview/Preview.js";
import { Kernel } from "./runtime/Kernel.js";
import { Notebook } from "./notebook/Notebook.js";
import { Toolbar } from "./ui/Toolbar.js";
import { Splitter } from "./ui/Splitter.js";
import { Shortcuts } from "./ui/Shortcuts.js";
import { Snackbar } from "./ui/Snackbar.js";
import { Dialog } from "./ui/Dialog.js";
import { ExamplePicker } from "./ui/ExamplePicker.js";
import { SettingsPanel } from "./ui/SettingsPanel.js";
import { CodeGenerator } from "./llm/CodeGenerator.js";
import { CodeExporter } from "./export/CodeExporter.js";
import { ProcessusPublisher } from "./export/ProcessusPublisher.js";
import { t } from "./i18n/index.js";

// Textes de la page dans la langue choisie (système par défaut, voir i18n/)
document.title = t("app.title");
document.querySelector("#subtitle").textContent = t("app.subtitle");

const preview = new Preview(document.querySelector("#preview"));
const kernel = new Kernel(preview);
const generator = new CodeGenerator();
const notebook = new Notebook(
  document.querySelector("#notebook"),
  defaultExample.steps,
  kernel,
  generator,
);

// Le mode du processus (JavaScript, p5.js, three.js, DOM) règle l'aperçu et la génération
const useMode = (mode) => (kernel.mode = generator.mode = mode);

// Le menu du titre charge un autre exemple (ou un autre mode) dans le processus
const picker = new ExamplePicker(
  document.querySelector("#examples"),
  examples,
  (example) => {
    useMode(example.mode);
    notebook.restart(example.steps);
  },
);
picker.show(defaultExample.steps);
useMode(picker.mode);
syncRemoteExamples(() => picker.refresh());

// « Relancer » applique les modifications de code des cellules déjà exécutées
preview.onReload = () => notebook.rerun();

// Après une suppression, on propose d'annuler
const snackbar = new Snackbar();
notebook.addEventListener("delete", () =>
  snackbar.show(t("snackbar.deleted"), t("snackbar.undo"), () =>
    notebook.undoDelete(),
  ),
);
// Idem après une réinitialisation complète ou un changement d'exemple
notebook.addEventListener("restart", ({ detail }) =>
  snackbar.show(
    detail.changed
      ? t("snackbar.loaded", { title: picker.title })
      : t("snackbar.reset"),
    t("snackbar.undo"),
    () => {
      notebook.undoRestart();
      picker.show(notebook.steps);
      useMode(picker.mode);
    },
  ),
);

// Publication d'un nouveau processus sur GitHub (avec traduction auto fr ↔ en)
const publishProcessus = async () => {
  settings.unlockAdmin();
  const steps = notebook.cells
    .map((cell) => ({
      title: cell.step.title || "",
      prompt: cell.prompt,
      code: cell.code.trim(),
    }))
    .filter((step) => step.prompt || step.code);
  if (!steps.length) return snackbar.show(t("publish.empty"));

  let token = settings.githubToken;
  if (!token) {
    token =
      (
        await Dialog.prompt(t("publish.tokenPrompt"), "", {
          password: true,
          placeholder: "ghp_…",
        })
      )?.trim() ?? "";
    if (!token) return;
    settings.githubToken = token;
  }

  const defaultTitle =
    picker.title === t("picker.newProcess") ? "" : picker.title;
  const title = (
    await Dialog.prompt(t("publish.titlePrompt"), defaultTitle)
  )?.trim();
  if (!title) return;

  settings.toggle(false);
  try {
    const { path, data } = await ProcessusPublisher.publish({
      title,
      mode: picker.mode,
      steps,
      client: generator.client,
      token,
      onStatus: (status) => toolbar.setStatus(status),
    });
    const entry = registerExample(path, data);
    picker.show(entry.steps);
    snackbar.show(t("publish.success", { title: entry.title }));
  } catch (error) {
    console.error(error);
    snackbar.show(t("publish.error", { message: error.message }));
  } finally {
    toolbar.setStatus();
  }
};

// Suppression du processus actuel sur GitHub
const unpublishProcessus = async () => {
  settings.unlockAdmin();
  const current = picker.current;
  if (!current?.path) return snackbar.show(t("publish.notSaved"));

  let token = settings.githubToken;
  if (!token) {
    token =
      (
        await Dialog.prompt(t("publish.tokenPrompt"), "", {
          password: true,
          placeholder: "ghp_…",
        })
      )?.trim() ?? "";
    if (!token) return;
    settings.githubToken = token;
  }

  if (
    !(await Dialog.confirm(
      t("publish.confirmDelete", { title: current.title }),
    ))
  )
    return;

  settings.toggle(false);
  try {
    await ProcessusPublisher.deleteFromGitHub(
      current.path,
      current.title,
      token,
      (status) => toolbar.setStatus(status),
    );
    unregisterExample(current.path);
    picker.fill(picker.mode);
    picker.select.selectedIndex = Math.min(1, picker.visible.length - 1);
    notebook.restart(picker.current.steps);
    snackbar.show(t("publish.deleted", { title: current.title }));
  } catch (error) {
    console.error(error);
    snackbar.show(t("publish.error", { message: error.message }));
  } finally {
    toolbar.setStatus();
  }
};

const toolbar = new Toolbar(
  document.querySelector("#toolbar"),
  notebook,
  () => picker.title,
  () => picker.mode,
  publishProcessus,
);

// Réglages (⚙︎) : service utilisé pour générer le code (LM Studio par défaut)
const settings = new SettingsPanel(document.querySelector("#toolbar"));
const useSettings = () => (generator.client = settings.createClient());
useSettings();
settings.addEventListener("change", useSettings);
settings.addEventListener("publish", publishProcessus);
settings.addEventListener("unpublish", unpublishProcessus);
new Splitter(
  document.querySelector("#splitter"),
  document.querySelector("#layout"),
);
new Shortcuts(notebook, publishProcessus, unpublishProcessus);

// Glisser-déposer d'un fichier .html (ou .json) téléchargé pour rouvrir le processus
document.body.dataset.dropHint = t("drop.hint");
let dragDepth = 0;
const hasFiles = (event) => event.dataTransfer?.types?.includes("Files");

window.addEventListener("dragenter", (event) => {
  if (!hasFiles(event)) return;
  event.preventDefault();
  dragDepth++;
  document.body.classList.add("is-dropping");
});
window.addEventListener("dragover", (event) => {
  if (!hasFiles(event)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
});
window.addEventListener("dragleave", (event) => {
  if (!hasFiles(event)) return;
  if (--dragDepth <= 0) {
    dragDepth = 0;
    document.body.classList.remove("is-dropping");
  }
});
window.addEventListener("drop", async (event) => {
  if (!hasFiles(event)) return;
  event.preventDefault();
  dragDepth = 0;
  document.body.classList.remove("is-dropping");
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;
  try {
    const fallbackTitle = file.name.replace(/\.(html?|json)$/i, "");
    const imported = CodeExporter.fromHtml(await file.text(), fallbackTitle);
    const entry = registerImported(imported);
    useMode(entry.mode);
    picker.show(entry.steps);
    notebook.restart(entry.steps);
    notebook.run(notebook.cells, { generate: false });
  } catch (error) {
    console.error(error);
    snackbar.show(t("drop.error", { message: error.message }));
  }
});
