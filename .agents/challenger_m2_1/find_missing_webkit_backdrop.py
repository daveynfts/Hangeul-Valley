import re

with open(r"C:\VibeCode\Hangeul Valley\index.html", "r", encoding="utf-8") as f:
    html = f.read()

style_match = re.search(r'<style[^>]*>([\s\S]*?)</style>', html)
css = style_match.group(1) if style_match else ""

lines = css.splitlines()
current_selector = ""
in_rule = False
rule_body = []
rule_line = 0

print("=== Analyzing backdrop-filter vs -webkit-backdrop-filter per line block ===")

for idx, line in enumerate(lines, 1):
    if 'backdrop-filter:' in line and '-webkit-backdrop-filter:' not in line:
        # Check surrounding 3 lines for -webkit-backdrop-filter
        surrounding = "\n".join(lines[max(0, idx-3):min(len(lines), idx+3)])
        if '-webkit-backdrop-filter' not in surrounding:
            print(f"Line {idx:4d}: {line.strip()}")

