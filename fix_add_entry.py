import sys

with open('src/modules/editor.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if "window.AppSchema.createEducationItem()" in l:
        lines[i] = l.replace("window.AppSchema.createEducationItem()", "{ school: '', major: '', time: '', bullets: [''] }")
    elif "window.AppSchema.createExperienceItem()" in l:
        lines[i] = l.replace("window.AppSchema.createExperienceItem()", "{ title: '', role: '', time: '', bullets: [''] }")

with open('src/modules/editor.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)

