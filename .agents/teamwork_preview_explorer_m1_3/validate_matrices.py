import sys

sys.stdout.reconfigure(encoding='utf-8')

# Let's test definitions of 16x16 matrices
matrices = {}

# 1. Slime
matrices['dungeon_green_slime'] = (
    {
        '.': None,
        'k': 0x064E3B, # Dark outline
        's': 0x047857, # Deep slime shadow
        'G': 0x10B981, # Slime mid
        'g': 0x34D399, # Slime light
        'H': 0xA7F3D0, # Slime highlight
        'W': 0xFFFFFF, # Eye white
        'E': 0x0F172A, # Pupil
        'c': 0x6EE7B7, # Nucleus glow
        'd': 0x059669  # Drip shadow
    },
    [
        ".....kkkkkk.....",
        "...kkGGGGGGkk...",
        "..kGGgHHHHgGGk..",
        ".kGGgHWWgHWWgGk.",
        ".kGsgHEEgHEEsgGk",
        ".kGssgHHgHHgssGk",
        ".kGGsscGGcssGGk.",
        ".kGGGGsGGsGGGGk.",
        "..kGGGssssGGGk..",
        "...kkGGGGGGkk...",
        "....kGsddsGk....",
        ".....kdsddk.....",
        "......kddk......",
        ".......kk.......",
        "................",
        "................"
    ]
)

# 2. Skeleton Archer
matrices['dungeon_skeleton_archer'] = (
    {
        '.': None,
        'k': 0x1C1917, # Dark outline
        'b': 0x78716C, # Bone shadow
        'B': 0xD6D3D1, # Bone mid
        'W': 0xF5F5F4, # Bone highlight
        'R': 0xEF4444, # Glowing red eye
        'S': 0x78350F, # Leather/Bow wood shadow
        'y': 0xD97706, # Bow wood highlight
        'M': 0x94A3B8, # Iron arrowhead mid
        'm': 0x64748B  # Iron arrowhead shadow
    },
    [
        ".....kkkkkk.....",
        "...kkWWWWWWkk...",
        "..kWWbWWbWWWWk..",
        ".kWWkRkWkRkWWWk.",
        ".kWWkkkkkkkWWWk.",
        "..kWbWbWbWbWWk..",
        "...kkWWWWWWkk...",
        "....kSBBBBBSk.M.",
        "...kSBBWWWBBSkM.",
        "..kSBBWkkkWBSmS.",
        ".kSBBWk...kWBmS.",
        "kSyBBk....kWBmS.",
        "kSyBk......kBmS.",
        ".kSk.......kk.S.",
        "................",
        "................"
    ]
)

# 3. Goblin Warrior
matrices['dungeon_goblin_warrior'] = (
    {
        '.': None,
        'k': 0x052E16, # Dark outline
        'e': 0x14532D, # Skin shadow
        'E': 0x16A34A, # Skin mid
        'H': 0x4ADE80, # Skin highlight
        'm': 0x334155, # Steel shadow
        'M': 0x64748B, # Steel mid
        'w': 0xCBD5E1, # Steel highlight
        'R': 0xDC2626, # Eye red
        'W': 0xFFFFFF  # Fang white
    },
    [
        "....kkk..kkk....",
        "...kEEEkkEEEk...",
        "..kEEHkEEkHEEk..",
        ".kEEERREEERRkEEk",
        ".kEEEEkEEkEEEEk.",
        "..kEEEWWWWEEEk..",
        "...kEEEEEEEEk...",
        "..kkMMMMMMMMkk..",
        ".kMMMmwMMwmMMMk.",
        ".kMmmmwMMwmMMMk.",
        ".kEEmMMMMMMmEEk.",
        "..kEkMMMMMMkEk..",
        "...kkEkkkkEk....",
        "....kEk..kEk....",
        "....kk....kk....",
        "................"
    ]
)

# 4. Dungeon Boss (Demon Lord)
matrices['dungeon_boss'] = (
    {
        '.': None,
        'k': 0x450A0A, # Dark outline
        'b': 0x18181B, # Obsidian horn shadow
        'm': 0x52525B, # Obsidian horn highlight
        'd': 0x991B1B, # Crimson shadow
        'D': 0xDC2626, # Crimson mid
        'F': 0xF97316, # Fiery highlight
        'Y': 0xFDE047, # Core yellow glow
        'E': 0xFEF08A, # Eye gold
        'W': 0xFFFFFF  # Fang white
    },
    [
        "kbk..........kbk",
        "kmbk........kmbk",
        ".kmbkkkkkkkkmbk.",
        "..kmbDDDDDDmbk..",
        "..kDDDFFFDDDDk..",
        ".kDDDkEkDDkEkDk.",
        ".kDDDkkkkkkkkDk.",
        ".kDDFDDWWDDFFDk.",
        "..kDDDFYYFDDDk..",
        "...kDDDDDDDDk...",
        "..kkbbDDDDbbkk..",
        ".kbmbkYYYYkbmbk.",
        ".kbmbkYFFYkbmbk.",
        "..kmbkkkkkkmbk..",
        "...kk......kk...",
        "................"
    ]
)

# 5. Arcade Player Ship
matrices['arcade_player_ship'] = (
    {
        '.': None,
        'k': 0x0F172A, # Dark outline
        'q': 0x1E293B, # Hull shadow
        'S': 0x0284C7, # Hull mid steel blue
        'C': 0x38BDF8, # Hull light cyan
        'W': 0xE0F2FE, # Canopy glass highlight
        'R': 0xEF4444, # Wingtip accent red
        'O': 0xF97316, # Thruster orange flame
        'E': 0xFDE047  # Engine core yellow
    },
    [
        ".......kk.......",
        "......kWWk......",
        "......kCCk......",
        ".....kCCCCk.....",
        ".....kSSSSk.....",
        "....kSqSSqSk....",
        "...kSSqSSqSSk...",
        "..kSSSSSSSSSSk..",
        ".kSSSSCSCSCSSSk.",
        "kRSSSSkCCkSSSSRk",
        "kRkSSk.kk.kSSkRk",
        "kkkSSk....kSSkkk",
        "..kOEk....kOEk..",
        "..kOOk....kOOk..",
        "...kk......kk...",
        "................"
    ]
)

# Validate rows & cols
print("=== MATRIX VALIDATION CHECK ===")
for key, (pal, mat) in matrices.items():
    print(f"Matrix: {key}")
    print(f"  Rows: {len(mat)}")
    valid_cols = True
    for r_idx, row in enumerate(mat):
        if len(row) != 16:
            print(f"  ERROR: Row {r_idx} length is {len(row)} (expected 16)")
            valid_cols = False
        for c in row:
            if c not in pal:
                print(f"  ERROR: Character '{c}' not in palette for {key}")
                valid_cols = False
    if valid_cols:
        print("  Status: VALID 16x16 matrix!")

