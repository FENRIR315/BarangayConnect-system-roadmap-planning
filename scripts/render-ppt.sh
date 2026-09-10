#!/usr/bin/env bash
# Render all slides of a .pptx to PNGs using LibreOffice + PyMuPDF.
# Usage: ./render-ppt.sh [path/to/deck.pptx] [output-dir]
set -euo pipefail

DECK="${1:-BarangayConnect_Presentation.pptx}"
OUT="${2:-ppt-preview}"
SOFFICE="C:\Program Files\LibreOffice\program\soffice.exe"

if [[ ! -f "$SOFFICE" ]]; then
  echo "LibreOffice not found at $SOFFICE" >&2
  exit 1
fi
if [[ ! -f "$DECK" ]]; then
  echo "Deck not found: $DECK" >&2
  exit 1
fi

rm -rf "$OUT"
mkdir -p "$OUT"

# 1) Convert pptx -> pdf (LibreOffice renders more reliably via PDF).
cmd //c "\"$SOFFICE\" --headless --convert-to pdf --outdir \"$OUT\" \"$DECK\""

# 2) pdf -> png per page via PyMuPDF.
python - "$OUT/$(basename "$DECK" .pptx).pdf" "$OUT" <<'PY'
import pymupdf, sys
pdf, outdir = sys.argv[1], sys.argv[2]
doc = pymupdf.open(pdf)
for i, page in enumerate(doc, 1):
    page.get_pixmap(dpi=110).save(f"{outdir}/slide-{i:02d}.png")
print(f"rendered {len(doc)} slides")
PY

ls "$OUT"