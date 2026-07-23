with open(r"C:\VibeCode\Hangeul Valley\game.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

out = []
for i in range(1600, 2200):
    out.append(f"{i+1}: {lines[i].rstrip()}")

with open(r"C:\VibeCode\Hangeul Valley\.agents\explorer_m1_1\textures_code.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out))

print("Wrote lines 1601-2200 to textures_code.txt")
