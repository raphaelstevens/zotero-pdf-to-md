var PDF2MD = {
  id: null,
  rootURI: null,

  init({ id, version, rootURI }) {
    this.id = id;
    this.rootURI = rootURI;

    // Register preferences pane
    Zotero.PreferencePanes.register({
      pluginID: this.id,
      src: rootURI + "preferences.xhtml",
      scripts: [rootURI + "preferences.js"],
      label: "PDF to MD",
    });
  },

  onWindowLoad(win) {
    const doc = win.document;

    const injectItem = () => {
      if (doc.getElementById("pdf2md-menuitem")) return;
      const menu = doc.getElementById("zotero-itemmenu");
      if (!menu) { Zotero.debug("[pdf2md] injectItem: zotero-itemmenu not found"); return; }
      const item = doc.createXULElement("menuitem");
      item.id = "pdf2md-menuitem";
      item.setAttribute("label", "Transform PDF to MD");
      item.addEventListener("command", () => this._handleConvert(win));
      menu.appendChild(item);
      Zotero.debug("[pdf2md] menu item injected, total children: " + menu.childElementCount);
    };

    // Try direct injection now (works if zotero-itemmenu already exists)
    injectItem();

    // Also hook popupshowing on document in case item is cleared on each open
    const onPopup = (ev) => {
      if (ev.target.id !== "zotero-itemmenu") return;
      injectItem();
    };
    win._pdf2mdPopupListener = onPopup;
    doc.addEventListener("popupshowing", onPopup);

    Zotero.debug("[pdf2md] onWindowLoad done, listener attached");
  },

  onWindowUnload(win) {
    win.document.getElementById("pdf2md-menuitem")?.remove();
    if (win._pdf2mdPopupListener) {
      win.document.removeEventListener("popupshowing", win._pdf2mdPopupListener);
      delete win._pdf2mdPopupListener;
    }
  },

  uninit() {},

  async _handleConvert(win) {
    const items = Zotero.getActiveZoteroPane().getSelectedItems();
    if (!items.length) return;
    const pdfs = await this._collectPDFs(items);
    if (!pdfs.length) {
      Services.prompt.alert(win, "PDF to MD", "No PDF attachments found.");
      return;
    }
    await this._convertAll(win, pdfs);
  },

  async _collectPDFs(items) {
    const pdfs = [];
    for (const item of items) {
      if (item.isRegularItem()) {
        for (const id of item.getAttachments()) {
          const att = await Zotero.Items.getAsync(id);
          if (att?.attachmentContentType === "application/pdf") {
            const path = await att.getFilePathAsync();
            if (path) pdfs.push({ path });
          }
        }
      } else if (item.isAttachment() && item.attachmentContentType === "application/pdf") {
        const path = await item.getFilePathAsync();
        if (path) pdfs.push({ path });
      }
    }
    return pdfs;
  },

  async _convertAll(win, pdfs) {
    const prefs = this._getPrefs();
    let ok = 0, fail = 0;
    for (const { path } of pdfs) {
      const outDir = (prefs.useCustomDir && prefs.customDir)
        ? prefs.customDir : PathUtils.parent(path);
      const res = await this._runPython(prefs.pythonPath, path, outDir, prefs.engine);
      res ? ok++ : fail++;
    }
    Services.prompt.alert(win, "PDF to MD",
      `Done: ${ok} converted` + (fail ? `, ${fail} failed.` : "."));
  },

  async _runPython(pythonPath, pdfPath, outDir, engine) {
    const tmp = Services.dirsvc.get("TmpD", Ci.nsIFile).path;
    const tmpScript = PathUtils.join(tmp, "pdf_to_md_zotero.py");
    const tmpOut    = PathUtils.join(tmp, "pdf_to_md_out.txt");

    // Extract Python script from XPI
    try {
      const text = await (await fetch(this.rootURI + "scripts/pdf_to_md.py")).text();
      await IOUtils.writeUTF8(tmpScript, text);
    } catch (e) {
      Zotero.logError("[pdf2md] fetch script: " + e);
      return false;
    }

    try {
      // Use nsIProcess directly -- avoids exec() exit-code issues on Windows
      const pyFile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
      pyFile.initWithPath(pythonPath);
      const proc = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);
      proc.init(pyFile);

      const args = [
        tmpScript,
        "--input", pdfPath,
        "--output", outDir,
        "--engine", engine || "markitdown",
        "--outfile", tmpOut,
      ];

      // Clear stale output from any previous run
      try { await IOUtils.remove(tmpOut); } catch (_) {}

      await new Promise((resolve) => {
        proc.runAsync(args, args.length, {
          observe(subject, topic) {
            if (topic === "process-finished" || topic === "process-failed") resolve();
          }
        });
      });

      let out = "";
      try { out = await IOUtils.readUTF8(tmpOut); } catch (_) {}
      Zotero.debug("[pdf2md] output: " + out);
      const success = out.trim().startsWith("OK:");
      if (!success) Zotero.logError("[pdf2md] failed output: " + out);
      return success;
    } catch (e) {
      Zotero.logError("[pdf2md] exec: " + e);
      return false;
    }
  },

  _getPrefs() {
    const b = Services.prefs.getBranch("extensions.pdf2md.");
    const s    = (k, d) => { try { return b.getStringPref(k); } catch (_) { return d; } };
    const bool = (k, d) => { try { return b.getBoolPref(k);   } catch (_) { return d; } };
    return {
      pythonPath:   s("pythonPath",   ""),
      useCustomDir: bool("useCustomDir", false),
      customDir:    s("customDir",    ""),
      engine:       s("engine",       "markitdown"),
    };
  },
};
