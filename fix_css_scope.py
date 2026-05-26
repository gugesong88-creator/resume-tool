import sys
import re

with open('assets/styles/templates.css', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    # If this line is for a section-title, section-icon, resume-name, or avatar, keep var(--accent)
    if ".section-title" in line or ".resume-name" in line or ".resume-header-avatar" in line or ".section-icon" in line or ".resume-header-logo" in line:
        new_lines.append(line)
        continue
    
    # Otherwise, replace color: var(--accent); with color: #222;
    line = line.replace("color: var(--accent);", "color: #222;")
    # Some elements might have background: var(--accent); that were mistakenly changed?
    # T04 .skill-tag had border: 1px solid #BEE3F8; color: var(--accent); let's make it #222.
    new_lines.append(line)

with open('assets/styles/templates.css', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

