import os

# Complete Palette dictionary mapping symbols to hex values
P = {
    '.': None,
    # Character base
    'X': 0xF9D09B, 'x': 0xD8A070, 'I': 0xFFB3B3, 'N': 0x2A1A0A,
    'T': 0xD4AA63, 't': 0xE8C988, 'V': 0xB3713D, 'R': 0x9E3B2D,
    'Z': 0x3B4D7A, 'z': 0x263354, 'Q': 0x1E2A4A, 'q': 0x161F38,
    'S': 0x59381E, 's': 0x382210, 'B': 0xD4AA63, 'W': 0xFFFFFF,
    # Metal / Watering Can / Sickle
    'm': 0x7A8B99, 'M': 0xA0B2C6, 'k': 0x4A5568, 'w': 0x3D7898, 'U': 0x96C5D4,
    'c': 0xC0C0C0, 'C': 0xE0E0E0,
    # Wood / Basket / Handle
    'Y': 0x8F5428, 'y': 0xB3713D, 'j': 0x573012, 'e': 0x59381E, 'E': 0x8F5428,
    # Crops / Fruit / Nature
    'A': 0xD85858, 'a': 0xFF6B6B, 'G': 0x4A7C59, 'g': 0x6B9E77, 'd': 0x7E5436, 'L': 0xE8B84B, 'D': 0x4E311B
}

matrices = {}

matrices['player_water_down_0'] = [
    "....TTTTTTTT....",
    "..TTTTTTTTTTTT..",
    "..VVVVVVVVVVVV..",
    "....RRRRRRRR....",
    "....XXXXXX......",
    "....XNXNXX......",
    "....XIXXIX......",
    "....XXXXXX......",
    "..ZZZZZZZZ......",
    "..ZZZZZZZZXXM...",
    "..ZZZZZZZZmMk...",
    "..QQQQQQQQ.kk...",
    "..QQQQ..QQQQ....",
    "..QQQQ..QQQQ....",
    "..SSSS..SSSS....",
    "..ssss..ssss...."
]

matrices['player_water_down_1'] = [
    "....TTTTTTTT....",
    "..TTTTTTTTTTTT..",
    "..VVVVVVVVVVVV..",
    "....RRRRRRRR....",
    "....XXXXXX......",
    "....XNXNXX......",
    "....XIXXIX......",
    "....XXXXXX......",
    "..ZZZZZZZZ......",
    "..ZZZZZZZZXX....",
    "..ZZZZZZZZ.MMk..",
    "..QQQQQQQQ..mww.",
    "..QQQQ..QQQQ.UU.",
    "..QQQQ..QQQQ.WW.",
    "..SSSS..SSSS.wW.",
    "..ssss..ssss...."
]

matrices['player_water_down_2'] = [
    "....TTTTTTTT....",
    "..TTTTTTTTTTTT..",
    "..VVVVVVVVVVVV..",
    "....RRRRRRRR....",
    "....XXXXXX......",
    "....XNXNXX......",
    "....XIXXIX......",
    "....XXXXXX......",
    "..ZZZZZZZZ......",
    "..ZZZZZZZZXX....",
    "..ZZZZZZZZ.MMk..",
    "..QQQQQQQQ..mUw.",
    "..QQQQ..QQQQ.wUW",
    "..QQQQ..QQQQ.WwU",
    "..SSSS..SSSSUWWw",
    "..ssss..ssss.wW."
]

matrices['player_harvest_down_0'] = [
    "................",
    "....TTTTTTTT....",
    "..TTTTTTTTTTTT..",
    "..VVVVVVVVVVVV..",
    "....RRRRRRRR....",
    "....XXXXXX......",
    "....XNXNXX......",
    "....XIXXIX......",
    "..ZZZZZZZZZZ....",
    "..ZZZZZZZZZZ....",
    ".ZZZZZZZZZZZZ...",
    ".QQQQQQQQQQQQ...",
    ".QQQQ.XX..QQQ...",
    ".SSSS.XX..SSS...",
    ".SSSS.....SSS...",
    ".ssss.....sss..."
]

matrices['player_harvest_down_1'] = [
    "................",
    "................",
    "....TTTTTTTT....",
    "..TTTTTTTTTTTT..",
    "..VVVVVVVVVVVV..",
    "....RRRRRRRR....",
    "....XXXXXX......",
    "....XNXNXX......",
    "....XIXXIX......",
    "..ZZZZZZZZZZ....",
    ".ZZZZZZZZZZZZ...",
    ".QQQQ.gGg.QQQ...",
    ".QQQQXAdAXQQQ...",
    ".SSSS.dDd.SSS...",
    ".SSSS.....SSS...",
    ".ssss.....sss..."
]

matrices['player_harvest_down_2'] = [
    "....TTTTTTTT....",
    "..TTTTTTTTTTTT..",
    "..VVVVVVVVVVVV..",
    "....RRRRRRRR....",
    "....XXXXXX......",
    "....XNXNXX......",
    "....XIXXIX......",
    "....XXgGgXX.....",
    "..ZZZXAdAXZZ....",
    "..ZZZZdDdzZZ....",
    "..ZZZZZZZZZZ....",
    "..QQQQQQQQQQ....",
    "..QQQQ..QQQQ....",
    "..QQQQ..QQQQ....",
    "..SSSS..SSSS....",
    "..ssss..ssss...."
]

matrices['player_pick_down_0'] = [
    "....TTTTTTTT....",
    "..XXTTTTTTTTXX..",
    "..XXTTTTTTTTXX..",
    "..VVVVVVVVVVVV..",
    "....RRRRRRRR....",
    "....XXXXXX......",
    "....XNXNXX......",
    "....XIXXIX......",
    "....XXXXXX......",
    "..ZZZZZZZZZZ....",
    "..ZZZZZZZZZZ....",
    "..QQQQQQQQQQ....",
    "..QQQQ..QQQQ....",
    "..QQQQ..QQQQ....",
    "..SSSS..SSSS....",
    "..ssss..ssss...."
]

matrices['player_pick_down_1'] = [
    "......gAaG......",
    "..XXXXAdAX..XX..",
    "..XXTTTTTTTTXX..",
    "..VVVVVVVVVVVV..",
    "....RRRRRRRR....",
    "....XXXXXX......",
    "....XNXNXX......",
    "....XIXXIX......",
    "....XXXXXX......",
    "..ZZZZZZZZZZ....",
    "..ZZZZZZZZZZ....",
    "..QQQQQQQQQQ....",
    "..QQQQ..QQQQ....",
    "..QQQQ..QQQQ....",
    "..SSSS..SSSS....",
    "..ssss..ssss...."
]

matrices['player_pick_down_2'] = [
    "....TTTTTTTT....",
    "..TTTTTTTTTTTT..",
    "..VVVVVVVVVVVV..",
    "....RRRRRRRR....",
    "....XXXXXX......",
    "....XNXNXX......",
    "....XIXXIX......",
    "....XXgGgXX.....",
    "..ZZZXaAaXZZ....",
    "..ZZZZdDdzZZ....",
    "..ZZZZZZZZZZ....",
    "..QQQQQQQQQQ....",
    "..QQQQ..QQQQ....",
    "..QQQQ..QQQQ....",
    "..SSSS..SSSS....",
    "..ssss..ssss...."
]

matrices['tool_watering_can'] = [
    "................",
    "......kkkk......",
    ".....kMMMMk.....",
    ".....k....k.....",
    ".....kMMMMk.....",
    "....kMMMMMMk....",
    "...kMMMMMMMMk...",
    "...kmmmmmmmmk...",
    "...kmmmmmmmmk...",
    "...kmmmmmmmmkmk.",
    "...kmmmmmmmm.mMk",
    "...kmmmmmmmm.mww",
    "....kkkkkkkk..wW",
    "................",
    "................",
    "................"
]

matrices['tool_basket'] = [
    "................",
    "......jjjj......",
    ".....jYYYYj.....",
    ".....j....j.....",
    ".....j....j.....",
    "...gGg.aAa.gG...",
    "..gAaAgAaAgLg...",
    ".jYyYyYyYyYyYj..",
    ".jYyYyYyYyYyYj..",
    ".jyYyYyYyYyYyj..",
    ".jYyYyYyYyYyYj..",
    ".jyYyYyYyYyYyj..",
    "..jjjjjjjjjjjj..",
    "................",
    "................",
    "................"
]

matrices['tool_sickle'] = [
    "................",
    ".......kkkk.....",
    ".....kkCCCCk....",
    "....kCCCCCCk....",
    "...kCCCCck......",
    "..kCCCCc........",
    "..kCCCk.........",
    ".kCCCCk.........",
    ".kCCCk..........",
    "..kCcEk.........",
    "...kEEek........",
    "....kEEek.......",
    ".....kEEek......",
    "......kjjk......",
    "................",
    "................"
]

all_valid = True
for name, mat in matrices.items():
    if len(mat) != 16:
        print(f"FAIL {name}: len = {len(mat)}")
        all_valid = False
        continue
    for r_idx, row in enumerate(mat):
        if len(row) != 16:
            print(f"FAIL {name} row {r_idx}: len = {len(row)} ('{row}')")
            all_valid = False
        for c_idx, ch in enumerate(row):
            if ch not in P:
                print(f"FAIL {name} row {r_idx} col {c_idx}: invalid char '{ch}'")
                all_valid = False

if all_valid:
    print("SUCCESS: ALL MATRICES VALIDATED PERFECTLY! (16x16, valid palette symbols)")
