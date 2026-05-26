import sys

with open('resume_chatgpt_stable_clean_v9.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, l in enumerate(lines):
    if "<label>整体色调</label>" in l:
        continue
    if "fmt-theme-color" in l and "onchange" in l:
        continue
    new_lines.append(l)

# Now insert it exactly once before <label>模块间距</label>
final_lines = []
for i, l in enumerate(new_lines):
    if "<label>模块间距</label>" in l:
        final_lines.append('    <label>整体色调</label>\n    <input type="color" id="fmt-theme-color" onchange="onFormatChange(\'themeColor\', this.value)" style="padding:0;width:24px;height:24px;border:none;cursor:pointer;margin-right:8px;">\n')
    final_lines.append(l)

with open('resume_chatgpt_stable_clean_v9.html', 'w', encoding='utf-8') as f:
    f.writelines(final_lines)

