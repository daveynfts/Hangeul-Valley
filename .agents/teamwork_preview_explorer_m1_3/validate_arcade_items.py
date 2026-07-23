import sys

sys.stdout.reconfigure(encoding='utf-8')

matrices = {}

# Alien Shooter (16x16)
matrices['alien_shooter'] = (
    {
        '.': None,
        'k': 0x3B0764, # Dark outline
        'p': 0x581C87, # Purple shadow
        'P': 0x7E22CE, # Purple mid
        'H': 0xC084FC, # Purple light
        'B': 0xEC4899, # Cannon magenta
        'W': 0xFFFFFF, # Cannon core hot white
        'E': 0xFDE047  # Core yellow pulse
    },
    [
        "......kkkk......",
        "....kkPPPPkk....",
        "..kkPPHHHHPPkk..",
        ".kBkPPkEEkPPkBk.",
        ".kBWBPPkkPPBWBk.",
        "kBWBkPPPPPPkBWBk",
        ".kBkPPpHHpPPkBk.",
        "..kkPPPPPPPPkk..",
        "...kPPpPPpPPk...",
        "....kPkkkkPk....",
        "....kk....kk....",
        "................",
        "................",
        "................",
        "................",
        "................"
    ]
)

# Alien Boss (Dreadnought)
matrices['alien_boss'] = (
    {
        '.': None,
        'k': 0x500724, # Dark outline
        'b': 0x881337, # Dark crimson armor shadow
        'm': 0xBE123C, # Mid crimson
        'B': 0xE11D48, # Crimson highlight
        'H': 0xFB7185, # Armor highlight pink
        'G': 0x22C55E, # Multi-eye green glow
        'P': 0xA855F7, # Core plasma purple
        'Y': 0xFDE047  # Thruster gold flare
    },
    [
        "..kkkkkkkkkkkk..",
        ".kBHHHHHHHHHHBk.",
        "kBBBBBBBBBBBBBBk",
        "kBBBkGkBBkGkBBBk",
        "kBBBkGkBBkGkBBBk",
        "kBBBkkkkkkkkBBBk",
        ".kBBBBkPPkBBBBk.",
        ".kBBBBkPPkBBBBk.",
        "..kBBBkPPkBBBk..",
        "..kBBBBBBBBBBk..",
        ".kbBbBBBBBBbBbk.",
        "kbmbkYYkYYkbmbk.",
        "kbmbkYYkYYkbmbk.",
        ".kkbkkkkkkkkbkk.",
        "...kk......kk...",
        "................"
    ]
)

# Powerup Weapon
matrices['powerup_weapon'] = (
    {
        '.': None,
        'k': 0x451A03, # Dark outline
        'y': 0xCA8A04, # Gold orb shadow
        'Y': 0xEAB308, # Gold orb mid
        'E': 0xFDE047, # Gold orb light
        'r': 0xB91C1C, # Weapon icon red shadow
        'R': 0xEF4444, # Weapon icon red mid
        'W': 0xFFFFFF  # Highlight white
    },
    [
        "......kkkk......",
        "....kkEEEEkk....",
        "...kEEWWEEEEk...",
        "..kEEkRRkkEEEk..",
        ".kEEkRRRRkkEEEk.",
        ".kEEkRRRRkkEEEk.",
        ".kEEykkRRkkEyEk.",
        "..kEEykkkkyEEk..",
        "...kEEyyyyEEk...",
        "....kkEEEEkk....",
        "......kkkk......",
        "................",
        "................",
        "................",
        "................",
        "................"
    ]
)

# Powerup Shield
matrices['powerup_shield'] = (
    {
        '.': None,
        'k': 0x0C4A6E, # Dark outline
        's': 0x0284C7, # Blue orb shadow
        'S': 0x38BDF8, # Blue orb mid
        'C': 0xBAE6FD, # Blue orb light
        'w': 0xE0F2FE, # Shield icon light
        'W': 0xFFFFFF  # Shield icon white
    },
    [
        "......kkkk......",
        "....kkCCCCkk....",
        "...kCCWWCCCCk...",
        "..kCCWWWWWWCCk..",
        ".kCCSWWWWWWSCCk.",
        ".kCCSWWWWWWSCCk.",
        ".kCCSsWWWwSsCCk.",
        "..kCCSsWWsSSCCk.",
        "...kCCSssSSCCk..",
        "....kkSSSSkk....",
        "......kkkk......",
        "................",
        "................",
        "................",
        "................",
        "................"
    ]
)

print("=== CHECKING FIXED MATRICES ===")
for key, (pal, mat) in matrices.items():
    print(f"Matrix: {key}")
    print(f"  Rows: {len(mat)}")
    valid = True
    for r_idx, row in enumerate(mat):
        if len(row) != 16:
            print(f"  ERROR in {key} row {r_idx}: length is {len(row)}")
            valid = False
        for c in row:
            if c not in pal:
                print(f"  ERROR in {key}: char '{c}' missing from palette")
                valid = False
    if valid:
        print("  Status: VALID 16x16 matrix!")

