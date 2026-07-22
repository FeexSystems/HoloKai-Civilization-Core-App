from __future__ import annotations

import json

from catalog_backend import ensure_storage_ready, storage_status


if __name__ == "__main__":
    res = ensure_storage_ready()
    print(json.dumps({"ensure": res, "status": storage_status()}, indent=2))
