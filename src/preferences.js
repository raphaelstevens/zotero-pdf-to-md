function _pdf2mdPrefsInit() {
  const $ = id => document.getElementById(id);

  // If DOM elements aren't ready yet, defer to load event
  if (!$("pythonPath")) {
    window.addEventListener("load", _pdf2mdPrefsInit, { once: true });
    return;
  }

  // Prevent double-init if both the immediate call and load event fire
  if ($("pythonPath")._pdf2mdInit) return;
  $("pythonPath")._pdf2mdInit = true;

  const B = "extensions.pdf2md.";
  const gs = (k, d) => { try { return Services.prefs.getBranch(B).getStringPref(k); } catch(_) { return d; } };
  const gb = (k, d) => { try { return Services.prefs.getBranch(B).getBoolPref(k); } catch(_) { return d; } };
  const ss = (k, v) => Services.prefs.getBranch(B).setStringPref(k, v);
  const sb = (k, v) => Services.prefs.getBranch(B).setBoolPref(k, v);

  const defaultPython = Zotero.isMac ? "/usr/local/bin/python3"
                      : Zotero.isLinux ? "/usr/bin/python3"
                      : "";
  if (Zotero.isMac || Zotero.isLinux) {
    $("pythonPath").placeholder = defaultPython + "  (run 'which python3' in Terminal to confirm)";
  }

  const savedPath = gs("pythonPath", "");
  if (!savedPath && defaultPython) {
    ss("pythonPath", defaultPython);
  }
  $("pythonPath").value = savedPath || defaultPython;
  $("engine").value         = gs("engine", "markitdown");
  $("useCustomDir").checked = gb("useCustomDir", false);
  $("customDir").value      = gs("customDir", "");
  updateDirState();

  $("pythonPath").addEventListener("input", e => { ss("pythonPath", e.target.value); $("testStatus").style.display = "none"; });
  $("engine").addEventListener("change", e => ss("engine", e.target.value));
  $("useCustomDir").addEventListener("change", e => { sb("useCustomDir", e.target.checked); updateDirState(); });
  $("customDir").addEventListener("input", e => ss("customDir", e.target.value));

  function updateDirState() {
    $("customDirRow").className = "row" + ($("useCustomDir").checked ? "" : " off");
  }

  // Get a valid browsing context for the file picker
  // window.browsingContext may be null in the prefs-pane iframe context
  function getBrowsingContext() {
    try { if (window.browsingContext) return window.browsingContext; } catch(_) {}
    try { return Zotero.getMainWindow().browsingContext; } catch(_) {}
    return null;
  }

  $("browseBtn").addEventListener("click", () => {
    try {
      const bc = getBrowsingContext();
      if (!bc) { show("Error: no browsing context", false); return; }
      const fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
      fp.init(bc, "Select Python", Ci.nsIFilePicker.modeOpen);
      fp.appendFilters(Ci.nsIFilePicker.filterAll);
      fp.open(rv => {
        if (rv === Ci.nsIFilePicker.returnOK) {
          $("pythonPath").value = fp.file.path;
          ss("pythonPath", fp.file.path);
          $("testStatus").style.display = "none";
        }
      });
    } catch(e) { show("Browse error: " + e.message, false); }
  });

  $("browseDirBtn").addEventListener("click", () => {
    try {
      const bc = getBrowsingContext();
      if (!bc) { show("Error: no browsing context", false); return; }
      const fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
      fp.init(bc, "Select Output Directory", Ci.nsIFilePicker.modeGetFolder);
      fp.open(rv => {
        if (rv === Ci.nsIFilePicker.returnOK) {
          $("customDir").value = fp.file.path;
          ss("customDir", fp.file.path);
        }
      });
    } catch(e) { show("Browse error: " + e.message, false); }
  });

  $("testBtn").addEventListener("click", async () => {
    const py = $("pythonPath").value.trim();
    if (!py) { show("No path set — enter the full path to your Python executable", false); return; }
    show("Testing...", true);
    try {
      // Check file exists before attempting to run
      const exists = await IOUtils.exists(py);
      if (!exists) {
        show("File not found: " + py + " — on Mac, run 'which python3' in Terminal to find the correct path", false);
        return;
      }
      const tmp = Services.dirsvc.get("TmpD", Ci.nsIFile).path;
      const tmpOut    = PathUtils.join(tmp, "pdf2md_test_out.txt");
      const tmpScript = PathUtils.join(tmp, "pdf2md_test.py");
      const outJson = JSON.stringify(tmpOut);
      await IOUtils.writeUTF8(tmpScript,
        `from pathlib import Path\nimport sys, io, tempfile, os\n` +
        `def run():\n` +
        `    try:\n` +
        `        import markitdown\n` +
        `    except ImportError as e:\n` +
        `        return "ERROR: markitdown not installed for " + sys.executable + " (" + str(e) + "). Run: " + sys.executable + " -m pip install \\"markitdown[pdf]\\""\n` +
        `    ver = getattr(markitdown, "__version__", "?")\n` +
        `    try:\n` +
        `        md = markitdown.MarkItDown()\n` +
        `    except Exception as e:\n` +
        `        return "ERROR: markitdown " + ver + " loaded but MarkItDown() failed: " + type(e).__name__ + ": " + str(e)\n` +
        `    # Probe PDF support with a minimal valid PDF\n` +
        `    pdf_bytes = (b"%PDF-1.1\\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\\n"\n` +
        `                 b"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\\n"\n` +
        `                 b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 100 100]>>endobj\\n"\n` +
        `                 b"xref\\n0 4\\n0000000000 65535 f\\n0000000010 00000 n\\n"\n` +
        `                 b"0000000053 00000 n\\n0000000100 00000 n\\n"\n` +
        `                 b"trailer<</Size 4/Root 1 0 R>>\\nstartxref\\n160\\n%%EOF\\n")\n` +
        `    fd, tmp_pdf = tempfile.mkstemp(suffix=".pdf")\n` +
        `    try:\n` +
        `        os.write(fd, pdf_bytes); os.close(fd)\n` +
        `        md.convert(tmp_pdf)\n` +
        `    except Exception as e:\n` +
        `        m = (type(e).__name__ + ": " + str(e)).lower()\n` +
        `        if "pdfminer" in m or "pdf" in m and "missing" in m or "no module" in m:\n` +
        `            return "ERROR: markitdown " + ver + " OK but PDF support missing. Run: " + sys.executable + " -m pip install \\"markitdown[pdf]\\""\n` +
        `        return "ERROR: markitdown " + ver + " PDF probe failed: " + type(e).__name__ + ": " + str(e)\n` +
        `    finally:\n` +
        `        try: os.unlink(tmp_pdf)\n` +
        `        except Exception: pass\n` +
        `    return "OK: Python " + sys.version.split()[0] + ", markitdown " + ver + " (PDF support OK)"\n` +
        `Path(${outJson}).write_text(run(), encoding="utf-8")\n`
      );
      const pyFile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
      pyFile.initWithPath(py);
      const proc = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);
      proc.init(pyFile);
      try { await IOUtils.remove(tmpOut); } catch (_) {}
      await new Promise(resolve => {
        proc.runAsync([tmpScript], 1, {
          observe(subject, topic) {
            if (topic === "process-finished" || topic === "process-failed") resolve();
          }
        });
      });
      let txt = "";
      try { txt = await IOUtils.readUTF8(tmpOut); } catch (_) {}
      if (!txt.trim()) {
        show("Python ran but produced no output — check Zotero error console (Help → Debug Output Logging)", false);
      } else {
        show(txt.trim(), txt.toLowerCase().includes("python"));
      }
    } catch(e) { show("Error: " + e.message, false); }
  });

  function show(msg, ok) {
    const el = $("testStatus");
    el.textContent = msg;
    el.className = ok ? "ok" : "err";
    el.style.display = "inline";
  }
}

// Try to init immediately, retry if DOM not ready
function _tryInit() {
  if (document.getElementById("pythonPath")) {
    _pdf2mdPrefsInit();
  } else {
    setTimeout(_tryInit, 100);
  }
}
_tryInit();
