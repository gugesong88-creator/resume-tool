import sys
import re

with open('assets/styles/templates.css', 'r', encoding='utf-8') as f:
    css = f.read()

css = re.sub(r'#0D9488', 'var(--accent)', css)
css = re.sub(r'#1E3A5F', 'var(--accent)', css)
css = re.sub(r'#2C5282', 'var(--accent)', css)
# T01 uses #111 and #222 for section title.
css = css.replace('color: #111; border-bottom: 1.5px solid #222;', 'color: var(--accent); border-bottom: 1.5px solid var(--accent);')

with open('assets/styles/templates.css', 'w', encoding='utf-8') as f:
    f.write(css)

