import sys

with open('resume_chatgpt_stable_clean_v9.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "if ((e.ctrlKey || e.metaKey) && e.key === 'b') {",
    "if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B' || e.code === 'KeyB')) {"
)

with open('resume_chatgpt_stable_clean_v9.html', 'w', encoding='utf-8') as f:
    f.write(content)

