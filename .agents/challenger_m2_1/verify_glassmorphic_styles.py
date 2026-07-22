import re

with open(r"C:\VibeCode\Hangeul Valley\index.html", "r", encoding="utf-8") as f:
    html = f.read()

style_match = re.search(r'<style[^>]*>([\s\S]*?)</style>', html)
css = style_match.group(1) if style_match else ""

print("=== Glassmorphic Design System Verification ===")
# 1. Variables
vars_check = [
    "--glass-bg-primary",
    "--glass-bg-darker",
    "--glass-bg-purple",
    "--glass-bg-green",
    "--glass-bg-pink",
    "--glass-bg-blue",
    "--glass-blur",
    "--glass-blur-webkit",
    "--neon-cyan",
    "--neon-purple",
    "--neon-gold",
    "--neon-green",
    "--neon-pink",
    "--neon-blue",
    "--glow-cyan",
    "--glow-purple",
    "--glow-gold",
    "--glow-green",
    "--glow-pink"
]

missing_vars = [v for v in vars_check if v not in css]
print(f"CSS Custom Properties (Design Tokens): {len(vars_check) - len(missing_vars)} / {len(vars_check)} present.")
if missing_vars:
    print(f"Missing variables: {missing_vars}")
else:
    print("[PASS] All 19 Glassmorphic design system CSS tokens defined in :root!")

# 2. Check modal backdrop-filter occurrences
backdrop_count = css.count("backdrop-filter:")
webkit_backdrop_count = css.count("-webkit-backdrop-filter:")
print(f"backdrop-filter declarations: {backdrop_count}")
print(f"-webkit-backdrop-filter declarations: {webkit_backdrop_count}")
if backdrop_count == webkit_backdrop_count:
    print("[PASS] 1:1 parity between standard and webkit vendor-prefixed backdrop-filter!")
else:
    print(f"[WARNING] Discrepancy between backdrop-filter ({backdrop_count}) and -webkit-backdrop-filter ({webkit_backdrop_count})")

# 3. Check font families
fonts = ['Be Vietnam Pro', 'Nunito', 'Noto Sans KR', 'Press Start 2P', 'VT323']
for font in fonts:
    in_css = font in css
    print(f"Font family '{font}': {'[PASS]' if in_css else '[FAIL]'}")

