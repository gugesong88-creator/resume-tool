import sys

with open('resume_chatgpt_stable_clean_v9.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

def find_block(start_str, num_lines_max=1000, start_offset=0):
    start_idx = -1
    for i in range(start_offset, min(len(lines), start_offset + 5000)):
        if start_str in lines[i]:
            start_idx = i
            break
    if start_idx == -1: return -1, -1
    
    open_braces = 0
    end_idx = -1
    for i in range(start_idx, min(start_idx + num_lines_max, len(lines))):
        open_braces += lines[i].count('{')
        open_braces -= lines[i].count('}')
        if open_braces == 0 and i > start_idx:
            end_idx = i
            break
    return start_idx, end_idx

fns_to_delete = [
    "function renderEditorPanels(",
    "function moveModuleUp(",
    "function moveModuleDown(",
    "function toggleModulePanel(",
    "function renderBasicInfoForm(",
    "function renderItemsForm(",
    "function onFieldChange(",
    "function onItemFieldChange(",
    "function onBulletChange(",
    "function addEntry(",
    "function deleteEntry(",
    "function addBullet(",
    "function removePhoto(",
    "(function initV6Enhancements() {",
    "(function initV10LocalFormattingV2() {"
]

for fn in fns_to_delete:
    s, e = find_block(fn, 1500)
    if s != -1 and e != -1:
        print(f"Deleting {fn} from {s} to {e}")
        for i in range(s, e + 1):
            lines[i] = ""

# Delete specific monkey patches wrappers
wrappers = [
    "if (typeof renderEditorPanels === 'function' && !renderEditorPanels.__v6Wrapped)",
    "if (typeof renderPreview === 'function' && !renderPreview.__v6Wrapped)",
    "if (typeof applyFormatting === 'function' && !applyFormatting.__v6Wrapped)"
]

for w in wrappers:
    s, e = find_block(w)
    if s != -1 and e != -1:
        print(f"Deleting wrapper {w[:20]}... from {s} to {e}")
        for i in range(s, e + 1):
            lines[i] = ""

# Delete `// v6. PERSONAL INFO COLOR + MODULE DIVIDER COLOR + ITEM SORTING` comment
for i in range(len(lines)):
    if "// v6. PERSONAL INFO COLOR" in lines[i]:
        lines[i] = ""

# Add script tag
for i, line in enumerate(lines):
    if '<script src="./src/modules/export.js"></script>' in line:
        lines.insert(i, '  <script src="./src/modules/editor.js"></script>\n')
        break

with open('resume_chatgpt_stable_clean_v9.html', 'w', encoding='utf-8') as f:
    f.writelines(lines)
