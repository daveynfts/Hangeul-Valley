import sys, json

sys.stdout.reconfigure(encoding='utf-8')

with open('../../save_data.json', 'r', encoding='utf-8') as f:
    old_save = json.load(f)

print("Original save_data.json (v3):")
print(json.dumps(old_save, indent=2, ensure_ascii=False))

def migrate_save(data):
    migrated = json.loads(json.dumps(data)) # clone
    v = migrated.get('v', 1)
    if v < 4:
        legacy_gold = migrated.get('gold', 0)
        migrated['v'] = 4
        migrated['currencies'] = {
            'coins': migrated.get('currencies', {}).get('coins', legacy_gold),
            'gems': migrated.get('currencies', {}).get('gems', 0),
            'honor': migrated.get('currencies', {}).get('honor', 0)
        }
        migrated['quests'] = migrated.get('quests', {
            'activeQuests': [],
            'completedQuests': [],
            'dailyResetTimestamp': 0
        })
        migrated['inventory'] = migrated.get('inventory', {
            'ingredients': {},
            'seeds': {},
            'scrolls': 0
        })
        migrated['recipes'] = migrated.get('recipes', {
            'unlockedRecipes': []
        })
        migrated['pets'] = migrated.get('pets', {
            'collection': [],
            'activePet': None
        })
        migrated['seasonal'] = migrated.get('seasonal', {
            'activeSeasonId': 'autumn_harvest_2026',
            'seasonPoints': 0,
            'claimedRewards': []
        })
        migrated['leaderboards'] = migrated.get('leaderboards', {
            'personalBests': {
                'arcadeHighScore': 0,
                'dungeonMaxFloor': 0,
                'duelMaxWinStreak': 0,
                'totalWordsMastered': 0
            }
        })
        # Keep gold property alias for backwards compat
        migrated['gold'] = migrated['currencies']['coins']
    return migrated

new_save = migrate_save(old_save)
print("\nMigrated save_data.json (v4):")
print(json.dumps(new_save, indent=2, ensure_ascii=False))
