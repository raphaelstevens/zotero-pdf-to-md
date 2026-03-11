var PDF2MD;

function install(data, reason) {}
function uninstall(data, reason) {}

async function startup({ id, version, rootURI }, reason) {
  // Wait for Zotero to be fully ready before doing anything
  await Zotero.initializationPromise;

  Services.scriptloader.loadSubScript(rootURI + "pdf2md.js");
  PDF2MD.init({ id, version, rootURI });

  // onMainWindowLoad is called by Zotero for windows that open AFTER startup.
  // For windows already open when the plugin installs, call manually.
  for (const win of Zotero.getMainWindows()) {
    PDF2MD.onWindowLoad(win);
  }
}

function shutdown({ id, version, rootURI }, reason) {
  if (reason === APP_SHUTDOWN) return;
  PDF2MD?.uninit();
  PDF2MD = undefined;
}

function onMainWindowLoad({ window }) {
  PDF2MD?.onWindowLoad(window);
}

function onMainWindowUnload({ window }) {
  PDF2MD?.onWindowUnload(window);
}
