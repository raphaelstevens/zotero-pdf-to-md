# ZoteroPDF2MD

A Zotero plugin to convert PDF attachments to Markdown via a right-click menu.

| ![PDFtoMD](/zotero-pdf-to-md-1.jpg) | ![PDFtoMD](/zotero-pdf-to-md-2.jpg) |
|------|------|

**Version:** 0.2.5 | **Target:** Zotero 7.0+ | **License:** MIT

---

## Requirements

- Zotero 7.0+
- Python 3.8+ with `markitdown[pdf]`:

```bash
pip install "markitdown[pdf]"
```

---

## Installation

1. Download `pdf2md.xpi` from [Releases](https://github.com/rsrs/zotero-pdf-to-md/releases)
2. Zotero → Tools → Add-ons → Install Add-on From File
3. Restart Zotero

---

## Usage

### Configure Python

Edit → Preferences → PDF to MD:

- Set the full path to your Python executable
- Click Test to verify Python and MarkItDown are working

### Convert

1. Select one or more items with PDF attachments
2. Right-click → Transform PDF to MD
3. `.md` files are saved next to the PDF, or in a custom folder if configured

---

## Configuration

| Setting | Description |
|---------|-------------|
| Python Path | Full path to Python executable |
| Test | Verify Python and MarkItDown |
| Custom Folder | Optional output directory |

---

## Troubleshooting

**Python not found** — use the full path (e.g. `C:\Python311\python.exe` or `/usr/bin/python3`), not just `python`. Zotero uses `nsIProcess` which requires an absolute path and does not consult your `PATH` environment variable.

**MarkItDown not found** — install for the *same* Python you pointed Zotero to: `"<that python>" -m pip install "markitdown[pdf]"`.

**PDF path not found / special characters** — resolved automatically: the script folds typographic punctuation (`' ' " " – —`, non-breaking spaces) to ASCII and scans the parent folder if the literal path doesn't match.

**Invalid output directory** — if *Custom folder* is checked but the path is empty or doesn't exist, the plugin falls back to the PDF's own folder.

**Conversion fails** — check Zotero console: Tools → Developer Tools → Run JavaScript / Error Console.

---

## How It Works

```
Right-click PDF → Python script runs → MarkItDown parses → .md written to disk
```

- Uses `nsIProcess` (not `exec`) for Windows compatibility
- Paths and options are passed to Python via a UTF-8 JSON config file (avoids Windows ANSI `argv` mangling non-ASCII characters)
- Python writes the result to a temp file; Zotero reads it back, then both temp files are deleted
- The Python script is extracted from the XPI at runtime

### Project Files

| File | Purpose |
|------|---------|
| `bootstrap.js` | Plugin lifecycle |
| `pdf2md.js` | Menu and conversion logic |
| `preferences.xhtml` | Settings UI |
| `preferences.js` | Settings logic and Python test |
| `scripts/pdf_to_md.py` | MarkItDown wrapper |
| `manifest.json` | Plugin metadata |

---

## Build

```bash
cd src/
zip -r ../pdf2md.xpi .
```

Or on Windows (PowerShell):

```powershell
Compress-Archive -Path src/* -DestinationPath pdf2md.zip -Force
Move-Item -Force pdf2md.zip pdf2md.xpi
```

---

## Further Development

- Add support for other conversion engines (Docling, etc.)
- Batch progress bar
- Metadata extraction (author, title, DOI) in output
- Custom output templates

---

## License

MIT — see [LICENSE](LICENSE).

Made by ❤️ [@raphaelstevens](https://github.com/raphaelstevens)
