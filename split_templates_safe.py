import sys

with open('resume_chatgpt_stable_clean_v9.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# The exact line blocks (0-indexed in python, so subtract 1 from the 1-indexed values)
# Block 1: 355 to 398 -> index 354 to 397 (inclusive)
# Block 2: 1561 to 1824 -> index 1560 to 1823 (inclusive)

block1 = lines[354:398]
block2 = lines[1560:1824]

# Double check that the starting lines match our expectations
if not block1[0].startswith('const TEMPLATES = ['):
    print("Error: Block 1 does not start with const TEMPLATES. Found:", block1[0].strip())
    sys.exit(1)

if not block2[0].startswith('function renderResumeHTML'):
    print("Error: Block 2 does not start with function renderResumeHTML. Found:", block2[0].strip())
    sys.exit(1)

# Delete block 2 first to avoid shifting indices for block 1
del lines[1560:1824]
# Delete block 1
del lines[354:398]

# Find where to insert script tags.
# Let's search for `<script src="./src/utils/html.js"></script>`
insert_idx = -1
for i, line in enumerate(lines):
    if '<script src="./src/utils/html.js"></script>' in line:
        insert_idx = i + 1
        break

if insert_idx == -1:
    print("Error: Could not find <script src=\"./src/utils/html.js\"></script>")
    sys.exit(1)

script_tags = """  <script src="./src/templates/t01-classic-dense.js"></script>
  <script src="./src/templates/t02-modern-icon.js"></script>
  <script src="./src/templates/t03-minimal-ats.js"></script>
  <script src="./src/templates/t04-business-clean.js"></script>
  <script src="./src/templates/index.js"></script>
"""

lines.insert(insert_idx, script_tags)

with open('resume_chatgpt_stable_clean_v9.html', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("HTML updated successfully.")
