import html.parser
import re
import sys

class HTMLStructuralParser(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.errors = []
        self.ids = set()
        self.duplicate_ids = set()
        self.void_elements = {
            'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
            'link', 'meta', 'param', 'source', 'track', 'wbr'
        }
        self.modals = []
        self.current_modal = None
        self.element_count = 0

    def handle_starttag(self, tag, attrs):
        self.element_count += 1
        attr_dict = dict(attrs)
        
        # Check IDs
        elem_id = attr_dict.get('id')
        if elem_id:
            if elem_id in self.ids:
                self.duplicate_ids.add(elem_id)
            else:
                self.ids.add(elem_id)

        # Check modal structural elements
        classes = attr_dict.get('class', '').split()
        if 'modal' in classes or 'modal-overlay' in classes or 'overlay' in classes or tag == 'dialog' or (elem_id and 'modal' in elem_id.lower()):
            self.modals.append({
                'tag': tag,
                'id': elem_id,
                'classes': classes,
                'line': self.getpos()[0],
                'col': self.getpos()[1]
            })

        if tag not in self.void_elements:
            self.stack.append((tag, self.getpos()))

    def handle_endtag(self, tag):
        if tag in self.void_elements:
            return

        if not self.stack:
            self.errors.append(f"Line {self.getpos()[0]}:{self.getpos()[1]} - Unexpected end tag </{tag}> with empty stack")
            return

        expected_tag, pos = self.stack[-1]
        if expected_tag == tag:
            self.stack.pop()
        else:
            # Check if matching tag exists higher up in stack
            matching_idx = None
            for idx in range(len(self.stack) - 1, -1, -1):
                if self.stack[idx][0] == tag:
                    matching_idx = idx
                    break
            
            if matching_idx is not None:
                unclosed = [f"<{t}> (line {p[0]})" for t, p in self.stack[matching_idx+1:]]
                self.errors.append(f"Line {self.getpos()[0]}:{self.getpos()[1]} - Mismatched end tag </{tag}>. Unclosed elements inside it: {', '.join(unclosed)}")
                self.stack = self.stack[:matching_idx]
            else:
                self.errors.append(f"Line {self.getpos()[0]}:{self.getpos()[1]} - Stray end tag </{tag}> without matching start tag (expected </{expected_tag}> from line {pos[0]})")

def verify_html(file_path):
    print(f"--- Empirical HTML Structure Check: {file_path} ---")
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    parser = HTMLStructuralParser()
    try:
        parser.feed(content)
    except Exception as e:
        print(f"HTML Parse Error: {e}")
        return False

    print(f"Total elements parsed: {parser.element_count}")
    print(f"Unique IDs found: {len(parser.ids)}")
    
    if parser.duplicate_ids:
        print(f"[FAIL] Duplicate IDs found ({len(parser.duplicate_ids)}):")
        for dup in sorted(parser.duplicate_ids):
            print(f"  - #{dup}")
    else:
        print("[PASS] No duplicate IDs found.")

    if parser.stack:
        print(f"[FAIL] Unclosed HTML tags remaining at EOF ({len(parser.stack)}):")
        for tag, pos in parser.stack:
            print(f"  - <{tag}> started at line {pos[0]}:{pos[1]}")
    else:
        print("[PASS] All HTML tags properly balanced and closed.")

    if parser.errors:
        print(f"[FAIL] HTML structural errors encountered ({len(parser.errors)}):")
        for err in parser.errors[:20]:
            print(f"  - {err}")
    else:
        print("[PASS] No tag mismatch or stray end tag errors found.")

    print(f"\nModals / Dialogs / Overlays detected ({len(parser.modals)}):")
    for m in parser.modals:
        print(f"  - Tag: <{m['tag']}> | ID: {m['id']} | Classes: {m['classes']} | Line: {m['line']}")

    return len(parser.duplicate_ids) == 0 and len(parser.stack) == 0 and len(parser.errors) == 0

if __name__ == "__main__":
    success = verify_html(r"C:\VibeCode\Hangeul Valley\index.html")
    sys.exit(0 if success else 1)
