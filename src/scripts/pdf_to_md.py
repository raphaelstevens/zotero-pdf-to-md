#!/usr/bin/env python3
import argparse, sys
from pathlib import Path

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input",   required=True)
    parser.add_argument("--output",  required=True)
    parser.add_argument("--engine",  default="markitdown", choices=["markitdown", "docling"])
    parser.add_argument("--outfile", default=None,
                        help="Write result line (OK:/ERROR:) to this file instead of stdout")
    args = parser.parse_args()

    pdf = Path(args.input).resolve()
    out = Path(args.output).resolve()

    def report(msg):
        if args.outfile:
            Path(args.outfile).write_text(msg + "\n", encoding="utf-8")
        else:
            print(msg)

    if not pdf.exists():
        report(f"ERROR: not found: {pdf}"); sys.exit(1)

    out.mkdir(parents=True, exist_ok=True)

    try:
        if args.engine == "markitdown":
            from markitdown import MarkItDown
            result = MarkItDown().convert(str(pdf))
            dest = out / (pdf.stem + ".md")
            dest.write_text(result.text_content, encoding="utf-8")
            report(f"OK: {dest}")
        else:
            report("ERROR: docling not yet implemented"); sys.exit(1)
    except ImportError as e:
        report(f"ERROR: {e}\nRun: pip install markitdown"); sys.exit(2)
    except Exception as e:
        report(f"ERROR: {e}"); sys.exit(1)

if __name__ == "__main__":
    main()
