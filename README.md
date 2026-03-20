# ZoteroPDF2MD

A Zotero plugin to convert PDF attachments to Markdown via a right-click menu.

| ![PDFtoMD](/zotero-pdf-to-md-1.jpg) | ![PDFtoMD](/zotero-pdf-to-md-2.jpg) |
|------|------|

**Version:** 0.2.0 | **Target:** Zotero 8.0.4+ | **License:** MIT

---

## Requirements

- Zotero 8.0.4+
- Python 3.8+ with `markitdown`:

```bash
pip install "markitdown[pdf]"
```

---

## Installation

1. Download `pdf2md_v0.xpi` from [Releases](https://github.com/rsrs/zotero-pdf-to-md/releases)
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

**Python not found** — use the full path (e.g. `C:\Python311\python.exe` or `/usr/bin/python3`), not just `python`.

**MarkItDown not found** — run `pip install markitdown[PDF]` `pip3 install markitdown[PDF]`

**Conversion fails** — check Zotero console: Tools → Developer Tools → Console.

---

## How It Works

```
Right-click PDF → Python script runs → MarkItDown parses → .md written to disk
```

- Uses `nsIProcess` (not `exec`) for Windows compatibility
- Python writes output to a temp file; Zotero reads it back
- Python script is extracted from the XPI at runtime

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
zip -r ../pdf2md_v0.xpi .
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
