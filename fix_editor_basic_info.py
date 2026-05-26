import sys

with open('src/modules/editor.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

def find_fn(fn_name):
    for i, l in enumerate(lines):
        if l.startswith(f"window.{fn_name} ="):
            for j in range(i, min(len(lines), i + 200)):
                if lines[j].startswith("};"):
                    return i, j
    return -1, -1

s, e = find_fn("renderBasicInfoForm")
if s != -1:
    new_fn = """window.renderBasicInfoForm = function(mod) {
  const d = mod.data || {};
  let formHtml = `
    <div class="info-field">
      <label>姓名</label>
      <input value="${window.escHtml(window.richTextToPlain(d.name||''))}" placeholder="张三"
        oninput="window.onFieldChange('${mod.id}', 'name', this.value)">
    </div>`;
    
  formHtml += `
    <div class="info-field" style="margin-bottom: 12px;">
      <label>简历照片</label>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="btn-outline btn-sm" onclick="document.getElementById('photo-upload-input').click()">上传照片</button>
        ${d.photo ? '<button class="btn-danger btn-sm" onclick="window.removePhoto()">移除照片</button>' : ''}
      </div>
      ${d.photo ? '<div style="margin-top:6px;font-size:11px;color:var(--text-muted)">✓ 已设置照片</div>' : ''}
    </div>`;

  const items = mod.items || [];
  formHtml += items.map((item, idx) => `
    <div class="entry-item" style="padding-bottom: 8px;">
      <div class="entry-item-header" style="margin-bottom: 4px;">
        <input style="font-weight:600; width: 100px; padding: 2px 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 11px;" value="${window.escHtml(window.richTextToPlain(item.label||''))}" oninput="window.onItemFieldChange('${mod.id}',${idx},'label',this.value)">
        <button class="btn-xs btn-danger" onclick="window.deleteEntry('${mod.id}',${idx})">删除</button>
      </div>
      <div class="entry-row" style="margin-top: 0;">
        <input value="${window.escHtml(window.richTextToPlain(item.value||''))}" placeholder="填写内容" oninput="window.onItemFieldChange('${mod.id}',${idx},'value',this.value)">
      </div>
    </div>
  `).join('');

  formHtml += `<button class="add-entry-btn" onclick="window.addEntry('${mod.id}')">+ 添加个人信息</button>`;
  return formHtml;
};
"""
    lines[s:e+1] = [new_fn]

# Update addEntry to support basic_info
s_add, e_add = find_fn("addEntry")
if s_add != -1:
    for i in range(s_add, e_add):
        if "mod.items.push(window.AppSchema.createExperienceItem());" in lines[i]:
            lines[i] = lines[i].replace("mod.items.push(window.AppSchema.createExperienceItem());", """mod.items.push({ title: '', role: '', time: '', bullets: [''] });""")
        elif "mod.items.push(window.AppSchema.createEducationItem());" in lines[i]:
            lines[i] = lines[i].replace("mod.items.push(window.AppSchema.createEducationItem());", """mod.items.push({ school: '', major: '', time: '', bullets: [''] });""")
        elif "if (mod.id === 'education')" in lines[i]:
            # Inject basic_info handling right before this or as part of if/else
            lines.insert(i, "  if (mod.id === 'basic_info') {\n    mod.items.push({ label: '新信息', value: '' });\n  } else ")
            break

with open('src/modules/editor.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)
