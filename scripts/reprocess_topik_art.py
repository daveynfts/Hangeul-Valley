"""Rebuild reviewed TOPIK sprites from the Imagegen sources recorded in the manifest."""
from __future__ import annotations

import argparse
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


def resolve_source(source_root: Path, entry: dict) -> Path:
    source_name = entry.get("sourceImage")
    if not source_name:
        raise SystemExit(f"Missing sourceImage for {entry.get('ko', entry.get('slug', 'unknown'))}")
    source_thread = entry.get("sourceThread")
    if source_thread:
        source = source_root / source_thread / source_name
        if source.exists():
            return source
    matches = list(source_root.glob(f"*/{source_name}"))
    if len(matches) != 1:
        raise SystemExit(f"Expected one cached source for {source_name}; found {len(matches)}")
    return matches[0]


def rebuild_one(payload: tuple[Path, dict, int, bool]) -> bool:
    source_root, entry, output_height, resume = payload
    destination = ROOT / "sprites" / entry["folder"] / f"{entry['slug']}.png"
    if resume and destination.exists():
        with Image.open(destination) as existing:
            if existing.format == "PNG" and existing.height == output_height:
                return False
    source = resolve_source(source_root, entry)
    processor.process(
        source,
        destination,
        max_h=output_height,
        colors=32,
        force_magenta=bool(entry.get("keyMagenta")),
    )
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source-root",
        type=Path,
        default=Path.home() / ".codex/generated_images",
        help="Directory containing per-thread Imagegen output folders",
    )
    parser.add_argument("--resume", action="store_true", help="Skip PNGs already at the manifest height")
    parser.add_argument("--jobs", type=int, default=min(6, os.cpu_count() or 2))
    parser.add_argument("--slug", action="append", help="Rebuild only this semantic slug; repeat as needed")
    args = parser.parse_args()
    manifest_path = ROOT / "docs/topik-art-manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    output_height = manifest.get("outputHeight", 48)
    if not isinstance(output_height, int) or output_height < 48 or output_height > 256:
        raise SystemExit("Invalid TOPIK outputHeight")
    entries = [entry for entry in manifest["entries"] if entry.get("reviewed") is True]
    if args.slug:
        requested = set(args.slug)
        entries = [entry for entry in entries if entry.get("slug") in requested]
        missing = requested - {entry.get("slug") for entry in entries}
        if missing:
            raise SystemExit("Unknown reviewed TOPIK slug(s): " + ", ".join(sorted(missing)))
    if not entries:
        raise SystemExit("No reviewed TOPIK sprites to rebuild")

    if args.jobs < 1 or args.jobs > 32:
        raise SystemExit("--jobs must be between 1 and 32")
    payloads = [(args.source_root, entry, output_height, args.resume) for entry in entries]
    with ProcessPoolExecutor(max_workers=args.jobs) as pool:
        rebuilt = sum(pool.map(rebuild_one, payloads, chunksize=1))
    print(f"Reprocessed {rebuilt} reviewed TOPIK sprites at {output_height} px"
          f" ({len(entries) - rebuilt} already current)")


if __name__ == "__main__":
    main()
