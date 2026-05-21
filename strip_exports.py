import sys

with open('resume_chatgpt_stable_clean_v9.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

def find_block(start_str, num_lines_max=400):
    start_idx = -1
    for i, line in enumerate(lines):
        if start_str in line and "function" in line:
            start_idx = i
            break
    if start_idx == -1: return -1, -1
    
    # naive brace matching
    open_braces = 0
    end_idx = -1
    for i in range(start_idx, min(start_idx + num_lines_max, len(lines))):
        open_braces += lines[i].count('{')
        open_braces -= lines[i].count('}')
        if open_braces == 0 and i > start_idx:
            end_idx = i
            break
    return start_idx, end_idx

# Delete the 4 original functions
for fn in ['exportMarkdown', 'exportVectorPDF', 'exportPDF', 'quickExport']:
    s, e = find_block(f"function {fn}(")
    if s != -1 and e != -1:
        print(f"Deleting {fn} from {s} to {e}")
        # Need to be careful deleting in loop, so replace with empty instead
        for i in range(s, e + 1):
            lines[i] = ""

# Delete monkey patches
# Monkey patch 1: `<script>\n(function enforcePDFScaleAndOffset() { ... })();\n</script>`
# Monkey patch 2: window.exportMarkdown = ...
# Monkey patch 3: window.quickExport = ...
# Let's just find `window.exportMarkdown` and `window.quickExport` and replace them.

for fn in ['window.exportMarkdown', 'window.quickExport', 'window.exportPDF', 'window.exportSingleEntity']:
    for _ in range(5): # in case there are multiple
        s, e = find_block(f"{fn} = function", 200)
        if s != -1 and e != -1:
            print(f"Deleting monkey patch {fn} from {s} to {e}")
            for i in range(s, e + 1):
                lines[i] = ""

# Add script tag
for i, line in enumerate(lines):
    if '<script src="./src/api/client.js"></script>' in line:
        lines.insert(i, '  <script src="./src/modules/export.js"></script>\n')
        break

with open('resume_chatgpt_stable_clean_v9.html', 'w', encoding='utf-8') as f:
    f.writelines(lines)
