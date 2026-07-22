from __future__ import annotations

import argparse
import json
from pathlib import Path

from ris_pipeline import import_ris_file


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Import RIS bibliography into HoloKai staging catalog (candidate sources)."
    )
    parser.add_argument("ris_path", help="Path to .ris file")
    parser.add_argument(
        "--verify-doi",
        action="store_true",
        help="Resolve DOI metadata and canonical landing URLs",
    )
    parser.add_argument(
        "--report",
        default="holokai_memory/ris_import_report.json",
        help="Output JSON report path",
    )
    args = parser.parse_args()

    result = import_ris_file(args.ris_path, verify_doi=args.verify_doi)

    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(result, indent=2), encoding="utf-8")

    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
