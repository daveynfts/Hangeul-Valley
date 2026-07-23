import os, sys
sys.stdout.reconfigure(encoding='utf-8')

project_root = r'C:/VibeCode/Hangeul Valley'

image_extensions = ('.png', '.jpg', '.jpeg', '.svg', '.gif', '.ico', '.webp', '.bmp')

found_images = []
for root, dirs, files in os.walk(project_root):
    # skip .git or node_modules if any
    if '.git' in root or 'node_modules' in root:
        continue
    for file in files:
        if file.lower().endswith(image_extensions):
            found_images.append(os.path.join(root, file))

print(f"=== SEARCH FOR EXTERNAL IMAGE ASSETS ===")
print(f"Found image files in project directory: {len(found_images)}")
for img in found_images:
    print("  ", img)

