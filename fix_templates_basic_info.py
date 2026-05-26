import sys
import glob

# 1. Update index.js L function and renderHeader signature
with open('src/templates/index.js', 'r', encoding='utf-8') as f:
    idx_content = f.read()

idx_content = idx_content.replace(
    '''  function L(key, label, value, placeholder, cls) {
    const isEmpty = !value;
    const ph = placeholder || '点击填写';
    return `<span class="contact-item ${isEmpty ? 'empty-field' : ''}"><span class="static-label">${label}：</span><span data-editable="basic_info.${key}" class="${cls||''}" style="${isEmpty ? 'color:#9CA3AF' : ''}">${isEmpty ? ph : window.escHtml(value)}</span></span>`;
  }''',
    '''  function L(idx, item, placeholder, cls) {
    const label = item.label || '标签';
    const value = item.value || '';
    const isEmpty = !value;
    const ph = placeholder || '点击填写';
    return `<span class="contact-item ${isEmpty ? 'empty-field' : ''}"><span class="static-label" data-editable="basic_info.items.${idx}.label">${window.escHtml(label)}：</span><span data-editable="basic_info.items.${idx}.value" class="${cls||''}" style="${isEmpty ? 'color:#9CA3AF' : ''}">${isEmpty ? ph : window.escHtml(value)}</span></span>`;
  }'''
)

idx_content = idx_content.replace(
    "html += templateDef.renderHeader(biData, L, window.escHtml);",
    "html += templateDef.renderHeader(biData, L, window.escHtml, bi);"
)

with open('src/templates/index.js', 'w', encoding='utf-8') as f:
    f.write(idx_content)

# 2. Update templates
for file in glob.glob('src/templates/t*.js'):
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    start_idx = -1
    end_idx = -1
    for i, l in enumerate(lines):
        if "renderHeader(" in l:
            start_idx = i
        if "renderModuleTitle(" in l and start_idx != -1:
            end_idx = i - 1
            break
            
    if start_idx != -1 and end_idx != -1:
        new_render_header = """  renderHeader(biData, L, escHtml, bi) {
    const { name, photo } = biData;
    const items = bi.items || [];
    let contactParts = items.map((item, idx) => L(idx, item));

    return `<div class="resume-header">
      <div class="resume-header-info">
        <div class="resume-name" data-editable="basic_info.name">${escHtml(name)}</div>
        <div class="resume-contact-lines" style="display: flex; flex-wrap: wrap; gap: 8px 12px; margin-top: 8px;">
          ${contactParts.join('')}
        </div>
      </div>
      ${photo ? `<div class="resume-header-photo"><img src="${escHtml(photo)}" alt="照片" onerror="this.style.display='none'"></div>` : `<div class="resume-header-photo resume-photo-placeholder" data-editable="basic_info._photo">📷<br>添加照片</div>`}
    </div>`;
  },
"""
        # Replace lines
        lines = lines[:start_idx] + new_render_header.split('\n')[:-1] + lines[end_idx+1:]
        
    with open(file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

