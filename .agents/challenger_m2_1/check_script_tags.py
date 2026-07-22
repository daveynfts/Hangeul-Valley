import re

with open(r"C:\VibeCode\Hangeul Valley\index.html", "r", encoding="utf-8") as f:
    html = f.read()

scripts = re.findall(r'<script[^>]*>[\s\S]*?</script>|<script[^>]*/>', html, re.IGNORECASE)
for idx, s in enumerate(scripts, 1):
    # Print opening tag line
    print(f"Script #{idx}: {s[:120]}...")
