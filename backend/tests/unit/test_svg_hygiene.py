"""SVGs do frontend não podem carregar metadata nem manifesto c2pa."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SCAN = [ROOT / "frontend" / "public", ROOT / "frontend" / "src"]
METADATA = re.compile(r"<\s*metadata\b", re.IGNORECASE)
C2PA = re.compile(r"c2pa", re.IGNORECASE)


def test_svgs_do_frontend_nao_tem_metadata_nem_c2pa():
    found = []
    scanned = 0
    for folder in SCAN:
        for path in folder.rglob("*.svg"):
            scanned += 1
            text = path.read_text(encoding="utf-8", errors="ignore")
            if METADATA.search(text) or C2PA.search(text):
                found.append(str(path.relative_to(ROOT)))
    assert scanned > 0
    assert found == []
