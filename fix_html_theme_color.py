import sys

with open('resume_chatgpt_stable_clean_v9.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(len(lines)):
    if "canvas.style.setProperty('--accent', t.accent);" in lines[i]:
        lines[i] = "  const themeColor = (editState.formatting && editState.formatting.themeColor) ? editState.formatting.themeColor : t.accent;\n  canvas.style.setProperty('--accent', themeColor);\n"
    elif "document.documentElement.style.setProperty('--accent', t.accent);" in lines[i]:
        lines[i] = "  document.documentElement.style.setProperty('--accent', themeColor);\n"

with open('resume_chatgpt_stable_clean_v9.html', 'w', encoding='utf-8') as f:
    f.writelines(lines)

