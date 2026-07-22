with open(r"C:\VibeCode\Hangeul Valley\index.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines, 1):
    if 'backdrop-filter' in line:
        print(f"Line {idx:4d}: {line.strip()}")
