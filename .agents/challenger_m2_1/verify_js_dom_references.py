import re
import html.parser
import sys

# 1. Parse HTML to collect all element IDs and class names
class HTMLCollector(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.classes = set()

    def handle_starttag(self, tag, attrs):
        attr_dict = dict(attrs)
        if 'id' in attr_dict:
            self.ids.add(attr_dict['id'])
        if 'class' in attr_dict:
            for cls in attr_dict['class'].split():
                self.classes.add(cls)

def check_references():
    with open(r"C:\VibeCode\Hangeul Valley\index.html", "r", encoding="utf-8") as f:
        html_content = f.read()

    collector = HTMLCollector()
    collector.feed(html_content)

    with open(r"C:\VibeCode\Hangeul Valley\game.js", "r", encoding="utf-8") as f:
        js_content = f.read()

    # Find getElementById calls
    get_elem_ids = set(re.findall(r"document\.getElementById\(\s*['\"]([^'\"]+)['\"]\s*\)", js_content))
    
    # Find querySelector / querySelectorAll calls targeting IDs (#id-name)
    query_ids = set(re.findall(r"querySelector(?:All)?\(\s*['\"]#([a-zA-Z0-9_\-]+)['\"]", js_content))
    
    # Combined referenced IDs in JS
    referenced_ids = get_elem_ids.union(query_ids)

    missing_ids = []
    found_ids = []

    for elem_id in sorted(referenced_ids):
        if elem_id in collector.ids:
            found_ids.append(elem_id)
        else:
            # Check if dynamically created or missing
            missing_ids.append(elem_id)

    print("=== JS to HTML DOM Reference Check ===")
    print(f"Total unique IDs referenced in game.js: {len(referenced_ids)}")
    print(f"IDs found in index.html: {len(found_ids)}")
    
    if missing_ids:
        print(f"\n[WARNING/FAIL] IDs referenced in game.js but NOT found in index.html static markup ({len(missing_ids)}):")
        for m in missing_ids:
            # Check context in JS
            lines = [i+1 for i, line in enumerate(js_content.splitlines()) if m in line]
            print(f"  - #{m} (used at JS lines: {lines[:5]})")
    else:
        print("\n[PASS] All IDs referenced in game.js exist in index.html!")

    # Check querySelector for classes (.class-name)
    query_classes = set(re.findall(r"querySelector(?:All)?\(\s*['\"]\.([a-zA-Z0-9_\-]+)['\"]", js_content))
    missing_classes = [c for c in sorted(query_classes) if c not in collector.classes]

    print(f"\nTotal unique classes referenced in querySelector(All) in game.js: {len(query_classes)}")
    if missing_classes:
        print(f"[INFO] Classes referenced in game.js but NOT in index.html (may be dynamically added) ({len(missing_classes)}):")
        for mc in missing_classes:
            lines = [i+1 for i, line in enumerate(js_content.splitlines()) if mc in line]
            print(f"  - .{mc} (used at JS lines: {lines[:5]})")

    return missing_ids

if __name__ == "__main__":
    missing = check_references()
