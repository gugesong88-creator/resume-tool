import sys

with open('resume_chatgpt_stable_clean_v9.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '''  applyFormattingToElements(canvas, f);
}''',
    '''  applyFormattingToElements(canvas, f);

  // Also apply theme color live
  const t = getTemplate(editState.resume.template_id);
  const tc = f.themeColor || t.accent || '#374151';
  canvas.style.setProperty('--accent', tc);
  document.documentElement.style.setProperty('--accent', tc);
}'''
)

with open('resume_chatgpt_stable_clean_v9.html', 'w', encoding='utf-8') as f:
    f.write(content)

