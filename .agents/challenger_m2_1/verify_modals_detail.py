import re

with open(r"C:\VibeCode\Hangeul Valley\index.html", "r", encoding="utf-8") as f:
    html_content = f.read()

# List of modal overlays/panels to check
modal_elements = [
    "level-select-overlay",
    "hud",
    "quiz-hint-reveal-card",
    "fish-album-overlay",
    "fish-album-panel",
    "vocab-overlay",
    "vocab-panel",
    "levelup-overlay",
    "levelup-card",
    "shop-overlay",
    "shop-panel",
    "vocab-ff-modal",
    "cat-dialog",
    "memory-overlay",
    "memory-panel",
    "alldone-overlay",
    "alldone-card",
    "trophy-overlay",
    "trophy-panel",
    "duel-overlay",
    "duel-panel"
]

print("=== Detailed Modal Structural Integrity Check ===")

for elem_id in modal_elements:
    pattern = rf'<([a-zA-Z0-9]+)[^>]*id=["\']{elem_id}["\'][^>]*>'
    match = re.search(pattern, html_content)
    if not match:
        print(f"[FAIL] Element #{elem_id} NOT found in index.html!")
        continue

    start_pos = match.start()
    tag_name = match.group(1)
    
    # Calculate line number
    line_num = html_content[:start_pos].count('\n') + 1
    
    # Check closing tag matching by counting tags
    pos = match.end()
    depth = 1
    end_pos = -1
    
    # Simple scanner for matching end tag
    tag_regex = re.compile(rf'</?{tag_name}(?:\s+[^>]*)?>', re.IGNORECASE)
    for m in tag_regex.finditer(html_content, pos):
        full_tag = m.group(0)
        if full_tag.startswith('</'):
            depth -= 1
        else:
            if not full_tag.endswith('/>'):
                depth += 1
        
        if depth == 0:
            end_pos = m.end()
            break

    if end_pos != -1:
        modal_block = html_content[start_pos:end_pos]
        close_btns = re.findall(r'<button[^>]*id=["\']([^"\']+)["\'][^>]*>', modal_block)
        close_class_btns = re.findall(r'<button[^>]*class=["\']([^"\']+)["\'][^>]*>', modal_block)
        print(f"[PASS] #{elem_id} (<{tag_name}> line {line_num}): Properly closed. Sub-buttons: IDs={close_btns}, Classes={close_class_btns}")
    else:
        print(f"[FAIL] #{elem_id} (<{tag_name}> line {line_num}): Could NOT find matching </{tag_name}> closing tag!")

print("\n=== CSS Selector & Glassmorphic Rule Cross-Check ===")
# Check if styles exist for modals
with open(r"C:\VibeCode\Hangeul Valley\index.html", "r", encoding="utf-8") as f:
    html = f.read()

style_match = re.search(r'<style[^>]*>([\s\S]*?)</style>', html)
if style_match:
    css = style_match.group(1)
    for elem_id in modal_elements:
        has_id_selector = f"#{elem_id}" in css
        print(f"  - #{elem_id:25s} CSS selector present: {has_id_selector}")
