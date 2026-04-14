#!/usr/bin/env python3
import argparse, json, sys, unicodedata
from pathlib import Path

# Zotero sometimes returns paths where ASCII punctuation has been replaced by
# typographic equivalents (or vice versa), so the literal path may not match
# what's on disk. We fold both sides to a canonical form and scan the parent
# directory for a match.
_PUNCT_FOLD = {
    "\u2018": "'", "\u2019": "'", "\u201A": "'", "\u201B": "'",  # single quotes
    "\u201C": '"', "\u201D": '"', "\u201E": '"', "\u201F": '"',  # double quotes
    "\u2013": "-", "\u2014": "-", "\u2212": "-",                 # en/em dash, minus
    "\u00A0": " ", "\u2009": " ", "\u202F": " ",                 # nbsp, thin spaces
}

def _fold(s):
    s = unicodedata.normalize("NFC", s)
    return "".join(_PUNCT_FOLD.get(c, c) for c in s).casefold()

def resolve_pdf(input_path):
    p = Path(input_path)
    if p.exists():
        return p.resolve()
    parent = p.parent
    if not parent.exists():
        return None
    target = _fold(p.name)
    for candidate in parent.iterdir():
        if _fold(candidate.name) == target:
            return candidate.resolve()
    return None

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config",  default=None,
                        help="UTF-8 JSON file with keys: input, output, engine, outfile")
    parser.add_argument("--input",   default=None)
    parser.add_argument("--output",  default=None)
    parser.add_argument("--engine",  default="markitdown", choices=["markitdown", "docling"])
    parser.add_argument("--outfile", default=None)
    args = parser.parse_args()

    if args.config:
        cfg = json.loads(Path(args.config).read_text(encoding="utf-8"))
        input_path  = cfg["input"]
        output_path = cfg["output"]
        engine      = cfg.get("engine", "markitdown")
        outfile     = cfg.get("outfile")
    else:
        input_path, output_path, engine, outfile = args.input, args.output, args.engine, args.outfile
        if not input_path or not output_path:
            print("ERROR: --input and --output required (or use --config)")
            sys.exit(2)

    def report(msg):
        if outfile:
            Path(outfile).write_text(msg + "\n", encoding="utf-8")
        else:
            print(msg)

    try:
        pdf = resolve_pdf(input_path)
        if pdf is None:
            report(f"ERROR: not found: {input_path}"); sys.exit(1)
        if not output_path:
            report("ERROR: output directory is empty (check 'Custom folder' setting)"); sys.exit(1)
        try:
            out = Path(output_path).resolve()
            out.mkdir(parents=True, exist_ok=True)
        except OSError as e:
            report(f"ERROR: invalid output directory {output_path!r}: {e}"); sys.exit(1)

        if engine == "markitdown":
            from markitdown import MarkItDown
            result = MarkItDown().convert(str(pdf))
            dest = out / (pdf.stem + ".md")
            dest.write_text(result.text_content, encoding="utf-8")
            report(f"OK: {dest}")
        else:
            report("ERROR: docling not yet implemented"); sys.exit(1)
    except ImportError as e:
        report(f"ERROR: {e}\nRun: pip install markitdown"); sys.exit(2)
    except SystemExit:
        raise
    except Exception as e:
        report(f"ERROR: {type(e).__name__}: {e}"); sys.exit(1)

if __name__ == "__main__":
    main()
