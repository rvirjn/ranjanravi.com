# Copyright © 2018-2026 ranjanravi.com. All rights reserved.
"""CLI for Moon janma nakshatra navatara wheel (logic in ``kundali.py``)."""

from __future__ import annotations

import sys
from pathlib import Path

_PY_DIR = Path(__file__).resolve().parent
if str(_PY_DIR) not in sys.path:
    sys.path.insert(0, str(_PY_DIR))

from kundali import EnrichKundali, NavataraFinder, build_navatara

__all__ = ["EnrichKundali", "NavataraFinder", "build_navatara"]


def main(input_nakshatra: str) -> None:
    root = Path(__file__).resolve().parent.parent
    result = build_navatara(root, input_nakshatra)
    out = root / "output" / f"navatara_{input_nakshatra.lower().replace(' ', '_')}.json"
    from utils.util import write_json_report

    write_json_report(out, result)
    print(f"output saved to: {out}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print('Usage: python py/navatara.py "<Nakshatra Name>"')
        sys.exit(1)
    main(" ".join(sys.argv[1:]).strip())
