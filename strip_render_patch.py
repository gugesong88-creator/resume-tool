import sys
with open('resume_chatgpt_stable_clean_v9.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

start = -1
for i, line in enumerate(lines):
    if "const _originalRenderHomePage = window.renderHomePage;" in line:
        start = i
        break

if start != -1:
    end = -1
    for i in range(start, len(lines)):
        if "};" in lines[i]:
            end = i
            break
    
    if end != -1:
        print(f"Deleting lines {start} to {end}")
        for i in range(start, end + 1):
            lines[i] = ""

with open('resume_chatgpt_stable_clean_v9.html', 'w', encoding='utf-8') as f:
    f.writelines(lines)

