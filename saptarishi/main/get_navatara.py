"""Backward-compatible shim — navatara logic lives in ``get_kundali.py``."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from get_kundali import EnrichKundali, NavataraFinder, build_navatara

__all__ = ["EnrichKundali", "NavataraFinder", "build_navatara"]


def main(input_nakshatra: str) -> None:
    root = Path(__file__).resolve().parent.parent
    result = build_navatara(root, input_nakshatra)
    out = root / "output" / f"navatara_{input_nakshatra.lower().replace(' ', '_')}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"output saved to: {out}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print('Usage: python main/get_navatara.py "<Nakshatra Name>"')
        sys.exit(1)
    main(" ".join(sys.argv[1:]).strip())
