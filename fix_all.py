import sys

# 1. Fix src/modules/editor.js to remove redundant UI panels
with open('src/modules/editor.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

def find_fn(fn_name):
    for i, l in enumerate(lines):
        if l.startswith(f"function {fn_name}"):
            for j in range(i, min(len(lines), i + 200)):
                if lines[j].startswith("}"):
                    return i, j
    return -1, -1

fns = ["renderBasicInfoColorBoxHTML", "renderDividerColorBoxHTML", "renderLocalFormatBoxHTML"]
for fn in fns:
    s, e = find_fn(fn)
    if s != -1:
        for i in range(s, e + 1):
            lines[i] = ""

for i in range(len(lines)):
    if "renderBasicInfoColorBoxHTML" in lines[i] or "renderDividerColorBoxHTML" in lines[i] or "renderLocalFormatBoxHTML" in lines[i]:
        lines[i] = ""

to_remove_window_fns = ["window.updateLocalFormat =", "window.updateMetaField =", "window.updateModuleDividerColor =", "window.applyPreviewEnhancements ="]
for fn in to_remove_window_fns:
    for i, l in enumerate(lines):
        if l.startswith(fn):
            for j in range(i, min(len(lines), i + 100)):
                if lines[j].startswith("};"):
                    for k in range(i, j + 1):
                        lines[k] = ""
                    break

with open('src/modules/editor.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)


# 2. Fix index.js L function
with open('src/templates/index.js', 'r', encoding='utf-8') as f:
    idx_content = f.read()

idx_content = idx_content.replace(
    '''  function L(key, label, value, placeholder, cls) {
    const isEmpty = !value;
    const ph = placeholder || '点击填写';
    return `<span class="contact-item"><span class="static-label">${label}：</span><span data-editable="basic_info.${key}" class="${cls||''}" style="${isEmpty ? 'color:#9CA3AF' : ''}">${isEmpty ? ph : window.escHtml(value)}</span></span>`;
  }''',
    '''  function L(idx, item, placeholder, cls) {
    const label = item.label || '标签';
    const value = item.value || '';
    const isEmpty = !value;
    const ph = placeholder || '点击填写';
    return `<span class="contact-item ${isEmpty ? 'empty-field' : ''}"><span class="static-label" data-editable="basic_info.items.${idx}.label">${window.escHtml(label)}：</span><span data-editable="basic_info.items.${idx}.value" class="${cls||''}" style="${isEmpty ? 'color:#9CA3AF' : ''}">${isEmpty ? ph : window.escHtml(value)}</span></span>`;
  }'''
)

with open('src/templates/index.js', 'w', encoding='utf-8') as f:
    f.write(idx_content)

# 3. Remove applyPreviewEnhancements from html and add CSS
with open('resume_chatgpt_stable_clean_v9.html', 'r', encoding='utf-8') as f:
    html_lines = f.readlines()

for i in range(len(html_lines)):
    if "if (typeof window.applyPreviewEnhancements === 'function')" in html_lines[i]:
        html_lines[i] = ""
        html_lines[i+1] = ""
        html_lines[i+2] = ""
    if "</style>" in html_lines[i]:
        html_lines.insert(i, ".a4-canvas.exporting .empty-field { display: none !important; }\n@media print { .empty-field { display: none !important; } }\n")
        break

with open('resume_chatgpt_stable_clean_v9.html', 'w', encoding='utf-8') as f:
    f.writelines(html_lines)

