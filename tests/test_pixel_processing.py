"""Regression coverage for erased outlines, transparent padding and blurred pixels."""
import importlib.util
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "process_prop", ROOT / ".grok/skills/farm-pixel-props/scripts/process_prop.py"
)
processor = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(processor)


class PixelProcessingTests(unittest.TestCase):
    def test_topik_words_do_not_use_reencoded_copies_of_the_same_image(self):
        manifest = json.loads((ROOT / 'docs/topik-art-manifest.json').read_text(encoding='utf-8'))
        files = [(entry['ko'], entry['file']) for entry in manifest['retained']]
        files += [(entry['ko'], 'sprites/' + entry['folder'] + '/' + entry['slug'] + '.png')
                  for entry in manifest['entries'] if entry.get('reviewed')]
        seen = {}
        for ko, file in files:
            with self.subTest(word=ko, file=file), Image.open(ROOT / file) as source:
                sprite = source.convert('RGBA')
                bounds = sprite.getchannel('A').getbbox()
                self.assertIsNotNone(bounds, 'The illustration must be visible')
                sprite = sprite.crop(bounds)
                # Ignore PNG compression, metadata and empty transparent padding.
                pixels = bytes(channel for pixel in sprite.getdata()
                               for channel in (pixel if pixel[3] else (0, 0, 0, 0)))
                digest = hashlib.sha256(str(sprite.size).encode('ascii') + pixels).hexdigest()
                self.assertNotIn(digest, seen, f'{ko} repeats the pixels of {seen.get(digest)}')
                seen[digest] = ko

    def test_reviewed_sprites_keep_native_size_and_crisp_pixels(self):
        manifest = json.loads((ROOT / "docs/art-redesign.json").read_text(encoding="utf-8"))
        files = [entry["file"] for entry in manifest["entries"]]
        files += ["sprites/items/" + slug + ".png" for slug in [
            "desk_fan", "light_feather", "dirty_laundry", "folded_quilt", "laundry_shop"
        ]]
        self.assertEqual(len(set(files)), 26, "Do not silently skip reviewed assets")
        topik = json.loads((ROOT / "docs/topik-art-manifest.json").read_text(encoding="utf-8"))
        reviewed = [entry for entry in topik["entries"] if entry.get("reviewed")]
        self.assertGreater(len(reviewed), 0, "Do not skip the resumed TOPIK artwork")
        files += ["sprites/" + entry["folder"] + "/" + entry["slug"] + ".png" for entry in reviewed]
        self.assertEqual(len(files), len(set(files)), "No repeated reviewed file paths")
        for file in files:
            with self.subTest(file=file):
                with Image.open(ROOT / file) as source:
                    self.assertEqual(source.format, "PNG")
                    self.assertEqual(source.height, 48)
                    sprite = source.convert("RGBA")
                pixels = list(sprite.getdata())
                self.assertEqual({p[3] for p in pixels}, {0, 255}, "No blurred alpha edges")
                self.assertLessEqual(len({p[:3] for p in pixels if p[3]}), 32)
                self.assertGreater(sum(p[3] == 255 for p in pixels), 100, "Keep a visible subject")
                self.assertEqual(sprite.getchannel("A").getbbox()[3], 48, "Feet stay on the baseline")
                self.assertFalse(any(processor.is_key_color(*p) for p in pixels), "No magenta matte islands")

    def test_native_transparency_preserves_black_cream_and_purple(self):
        sprite = Image.new("RGBA", (5, 5), (0, 0, 0, 0))
        colors = [(12, 8, 14, 255), (252, 248, 233, 255), (198, 60, 156, 255)]
        for y, color in enumerate(colors, 1):
            sprite.putpixel((0, y), color)  # Deliberately touch the canvas edge.
            sprite.putpixel((1, y), color)
        self.assertEqual(processor.key_magenta(sprite).tobytes(), sprite.tobytes())

    def test_reviewed_valley_map_sprites_keep_declared_size_and_clean_alpha(self):
        manifest = json.loads((ROOT / "docs/valley-map-art-manifest.json").read_text(encoding="utf-8"))
        entries = manifest["entries"]
        self.assertEqual(len(entries), 9, "Do not silently skip a redesigned map sprite")
        self.assertEqual(len({entry["file"] for entry in entries}), 9, "Every map role needs its own PNG")
        for entry in entries:
            with self.subTest(role=entry["role"], file=entry["file"]):
                with Image.open(ROOT / entry["file"]) as source:
                    self.assertEqual(source.format, "PNG")
                    self.assertEqual(source.height, entry["height"])
                    sprite = source.convert("RGBA")
                pixels = list(sprite.getdata())
                self.assertEqual({p[3] for p in pixels}, {0, 255}, "No blurred alpha edges")
                self.assertLessEqual(len({p[:3] for p in pixels if p[3]}), 32)
                self.assertGreater(sum(p[3] == 255 for p in pixels), 100, "Keep a visible subject")
                self.assertEqual(sprite.getchannel("A").getbbox()[3], entry["height"], "Art sits on its baseline")
                self.assertFalse(any(processor.is_key_color(*p) for p in pixels), "No magenta matte islands")

    def test_magenta_key_keeps_enclosed_artwork(self):
        sprite = Image.new("RGBA", (7, 7), (255, 0, 255, 255))
        for x in range(1, 6):
            for y in range(1, 6):
                sprite.putpixel((x, y), (30, 18, 25, 255))
        sprite.putpixel((3, 3), (198, 60, 156, 255))  # Purple clothing inside outline.
        sprite.putpixel((4, 3), (255, 0, 255, 255))  # Enclosed background gap.
        cleaned = processor.key_magenta(sprite)
        self.assertEqual(cleaned.getpixel((0, 0))[3], 0)
        self.assertEqual(cleaned.getpixel((3, 3)), (198, 60, 156, 255))
        self.assertEqual(cleaned.getpixel((4, 3))[3], 0)
        self.assertEqual(cleaned.getpixel((1, 1)), (30, 18, 25, 255))

    def test_opaque_neutral_background_is_not_guessed_as_a_key(self):
        for color in [(0, 0, 0, 255), (255, 255, 255, 255)]:
            sprite = Image.new("RGBA", (4, 4), color)
            self.assertEqual(processor.key_magenta(sprite).tobytes(), sprite.tobytes())

    def test_explicit_reserved_matte_removes_islands_in_partial_cutout(self):
        sprite = Image.new("RGBA", (5, 5), (0, 0, 0, 0))
        sprite.putpixel((2, 2), (255, 0, 255, 255))
        sprite.putpixel((2, 1), (245, 230, 207, 255))
        sprite.putpixel((1, 2), (25, 12, 21, 255))
        self.assertEqual(processor.key_magenta(sprite).getpixel((2, 2))[3], 255)
        cleaned = processor.key_magenta(sprite, force=True)
        self.assertEqual(cleaned.getpixel((2, 2))[3], 0)
        self.assertEqual(cleaned.getpixel((2, 1)), sprite.getpixel((2, 1)))
        self.assertEqual(cleaned.getpixel((1, 2)), sprite.getpixel((1, 2)))

    def test_resize_does_not_blur_or_invent_colors(self):
        with tempfile.TemporaryDirectory() as directory:
            src, dest = Path(directory) / "source.png", Path(directory) / "result.png"
            sprite = Image.new("RGBA", (3, 3), (0, 0, 0, 0))
            sprite.putpixel((1, 0), (25, 15, 10, 255))
            sprite.putpixel((1, 1), (249, 228, 180, 255))
            sprite.putpixel((1, 2), (99, 145, 89, 255))
            sprite.save(src)
            processor.process(src, dest, max_h=24, pad=0)
            result = Image.open(dest).convert("RGBA")
            self.assertEqual(result.height, 24)
            self.assertTrue(set(result.getdata()).issubset(set(sprite.getdata())))
            self.assertTrue({p[3] for p in result.getdata()}.issubset({0, 255}))
            self.assertGreater(result.getchannel("A").getbbox()[3], 23)

    def test_palette_is_bounded_without_changing_silhouette(self):
        sprite = Image.new("RGBA", (20, 20), (0, 0, 0, 0))
        for x in range(1, 19):
            for y in range(1, 19):
                sprite.putpixel((x, y), (x * 12, y * 12, 60, 255))
        result = processor.limit_palette(sprite, colors=16)
        self.assertEqual(sprite.getchannel("A").tobytes(), result.getchannel("A").tobytes())
        self.assertLessEqual(len({p[:3] for p in result.getdata() if p[3]}), 16)

    def test_padding_does_not_multiply_alpha(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory) / "sprites/characters/test"
            folder.mkdir(parents=True)
            sprite = Image.new("RGBA", (8, 4), (80, 60, 40, 128))
            target = folder / "walk_down_0.png"
            sprite.save(target)
            processor.pad_set(Path(directory), "characters/test", height=8)
            result = Image.open(target)
            self.assertEqual(result.size, (8, 8))
            self.assertEqual(result.getpixel((0, 7)), (80, 60, 40, 128))


if __name__ == "__main__":
    unittest.main()
