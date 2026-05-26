import sys
import re

with open('assets/styles/templates.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace hardcoded colors with var(--accent) where they are clearly the accent color
css = re.sub(r'color:\s*#0D9488;', 'color: var(--accent);', css)
css = re.sub(r'border-bottom:\s*2px solid #0D9488;', 'border-bottom: 2px solid var(--accent);', css)

css = re.sub(r'color:\s*#1E3A5F;', 'color: var(--accent);', css)
css = re.sub(r'border-bottom:\s*1.5px solid #1E3A5F;', 'border-bottom: 1.5px solid var(--accent);', css)
css = re.sub(r'border-bottom:\s*2px solid #1E3A5F;', 'border-bottom: 2px solid var(--accent);', css)
css = re.sub(r'background:\s*#1E3A5F;', 'background: var(--accent);', css)

css = re.sub(r'color:\s*#2C5282;', 'color: var(--accent);', css)
css = re.sub(r'border-bottom:\s*2px solid #2C5282;', 'border-bottom: 2px solid var(--accent);', css)

# T01 uses #222 for border and #111 for title. Make them accent.
css = css.replace('color: #111; border-bottom: 1.5px solid #222;', 'color: var(--accent); border-bottom: 1.5px solid var(--accent);')
css = css.replace('color: #111;', 'color: var(--accent);') # check if we want this everywhere in t01?
# Let's be careful. Let's just do it manually for T01.

with open('assets/styles/templates.css', 'w', encoding='utf-8') as f:
    f.write(css)

