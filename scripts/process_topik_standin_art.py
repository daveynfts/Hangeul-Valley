"""Process generated TOPIK stand-in replacements into crisp 96 px sprites."""
from __future__ import annotations

import argparse
import hashlib
from concurrent.futures import ProcessPoolExecutor
import importlib.util
import json
import os
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PROCESSOR_PATH = ROOT / ".grok/skills/farm-pixel-props/scripts/process_prop.py"
SPEC = importlib.util.spec_from_file_location("process_prop", PROCESSOR_PATH)
if SPEC is None or SPEC.loader is None:
    raise SystemExit(f"Cannot load sprite processor: {PROCESSOR_PATH}")
processor = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(processor)


def source_for(source_root: Path, entry: dict) -> Path:
    source = source_root / entry["sourceThread"] / entry["sourceImage"]
    if not source.exists():
        raise FileNotFoundError(f"Missing source for {entry['ko']}: {source}")
    return source


def process_one(payload: tuple[Path, dict, int, bool, dict]) -> tuple[str, dict, bool]:
    source_root, entry, height, resume, cache = payload
    destination = ROOT / "sprites" / entry["folder"] / f"{entry['slug']}.png"
    source = source_for(source_root, entry)
    fingerprint = hashlib.sha256(source.read_bytes()).hexdigest()
    spec = {"sourceHash": fingerprint, "height": height, "colors": 32,
            "keyMagenta": bool(entry.get("keyMagenta"))}
    if resume and destination.exists() and cache.get("spec") == spec:
        if hashlib.sha256(destination.read_bytes()).hexdigest() == cache.get("spriteHash"):
            return entry["slug"], cache, False
    processor.process(source, destination, max_h=height, colors=32,
                      force_magenta=spec["keyMagenta"])
    result = {"spec": spec, "spriteHash": hashlib.sha256(destination.read_bytes()).hexdigest()}
    return entry["slug"], result, True


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", type=Path, default=Path.home() / ".codex/generated_images")
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--jobs", type=int, default=min(6, os.cpu_count() or 2))
    parser.add_argument("--start", type=int, default=0, help="World index lower bound, inclusive")
    parser.add_argument("--end", type=int, default=10_000, help="World index upper bound, exclusive")
    args = parser.parse_args()
    if not 1 <= args.jobs <= 32:
        raise SystemExit("--jobs must be between 1 and 32")
    queue = json.loads((ROOT / "docs/topik-standin-art-queue.json").read_text(encoding="utf-8"))
    height = queue.get("outputHeight", 96)
    entries = [entry for entry in queue["entries"]
               if entry.get("sourceImage") and args.start <= entry["index"] < args.end]
    if not entries:
        raise SystemExit("No generated queue entries in the requested range")
    cache_file = ROOT / '.codex-topik-processing-cache.json'
    cache = json.loads(cache_file.read_text(encoding='utf-8')) if cache_file.exists() else {}
    payloads = [(args.source_root, entry, height, args.resume, cache.get(entry['slug'], {}))
                for entry in entries]
    changed = 0
    with ProcessPoolExecutor(max_workers=args.jobs) as pool:
        for slug, result, was_changed in pool.map(process_one, payloads, chunksize=1):
            cache[slug] = result
            changed += was_changed
    cache_file.write_text(json.dumps(cache, indent=2) + '\n', encoding='utf-8')
    print(f"Processed {changed} of {len(entries)} generated TOPIK stand-in replacements at {height} px")


if __name__ == "__main__":
    main()
