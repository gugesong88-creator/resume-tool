// src/modules/editor.js
// Consolidates Editor UI logic, field change handlers, and local formatting enhancements

(function() {

// Helper: Basic Info Color Box

// Helper: Divider Color Box

// Helper: Sort Box
function renderSortBoxHTML(modId, mod) {
  if (!mod.items || mod.items.length < 2) return '';
  const isLinked = mod.is_global_linked && window.currentRoute !== 'profile';
  if (isLinked) return ''; // Hide sort box if linked
  
  let html = `
    <div class="v6-enhance-box" style="margin: 8px 0; padding: 8px; border: 1px dashed #D1D5DB; border-radius: 8px; background: #EEF2FF;">
      <div style="font-size: 12px; font-weight: 600; margin-bottom: 6px; color: #374151;">条目快速排序 (交换位置)</div>
      <div style="display:flex; flex-wrap:wrap; gap: 4px;">
  `;
  mod.items.forEach((item, idx) => {
    const t = item.title || item.company || item.school || item.project_name || ('条目' + (idx + 1));
    const titleSnippet = window.escHtml(window.richTextToPlain(t)).substring(0, 6);
    html += `
      <div style="display:flex; align-items:center; background:#fff; border:1px solid #C7D2FE; border-radius:4px; padding:2px; font-size:11px;">
        <span style="padding:0 4px;">${idx + 1}.${titleSnippet}</span>
        ${idx > 0 ? `<button onclick="v6SwapItem('${modId}', ${idx}, ${idx - 1})" style="border:none;background:none;cursor:pointer;color:#4F46E5;padding:0 2px;" title="前移">←</button>` : ''}
        ${idx < mod.items.length - 1 ? `<button onclick="v6SwapItem('${modId}', ${idx}, ${idx + 1})" style="border:none;background:none;cursor:pointer;color:#4F46E5;padding:0 2px;" title="后移">→</button>` : ''}
      </div>
    `;
  });
  html += `</div></div>`;
  return html;
}

// Helper: Local Format Box (v10)

window.renderEditorPanels = function() {
  if (!window.editState) return;
  const modules = window.editState.resume.modules;
  const container = document.getElementById('editor-left-panel');
  const orderedModules = Object.values(modules).sort((a,b) => a.order - b.order);

  container.innerHTML = orderedModules.map(mod => {
    let bodyHtml = '';
    
    // Inject Enhancements cleanly
    if (mod.id === 'basic_info') {
    }
    bodyHtml += renderSortBoxHTML(mod.id, mod);

    if (mod.id === 'basic_info') {
      bodyHtml += window.renderBasicInfoForm(mod);
    } else {
      bodyHtml += window.renderItemsForm(mod);
    }

    const collapsed = !mod.visible && mod.deletable;
    let headerExtra = '';
    if (!mod.deletable) {
      headerExtra = '<span class="panel-tag required">必选</span>';
    } else if (!mod.visible) {
      headerExtra = '<span class="panel-tag hidden-tag">已隐藏</span>';
    }

    return `
      <div class="module-panel ${collapsed ? 'collapsed' : 'open'} ${mod.visible ? '' : 'hidden-module'}" data-module="${mod.id}">
        <div class="module-panel-header" onclick="window.toggleModulePanel('${mod.id}')">
          <div class="module-panel-title">
            <span class="collapse-icon">▼</span>
            <span data-editable-module-title="${mod.id}">${window.escHtml(window.richTextToPlain(mod.title))}</span>
            ${headerExtra}
          </div>
          <div class="module-panel-actions" onclick="event.stopPropagation()">
            ${mod.deletable ? `
              <button class="btn-xs btn-reorder" onclick="window.moveModuleUp('${mod.id}')" title="上移">↑</button>
              <button class="btn-xs btn-reorder" onclick="window.moveModuleDown('${mod.id}')" title="下移">↓</button>
              <button class="btn-xs btn-outline" onclick="window.toggleModuleVisible('${mod.id}')" title="${mod.visible ? '隐藏' : '显示'}">${mod.visible ? '👁' : '👁‍🗨'}</button>
              <button class="btn-xs btn-danger" onclick="window.deleteModuleConfirm('${mod.id}')" title="删除">✕</button>
            ` : ''}
          </div>
        </div>
        <div class="module-panel-body">${bodyHtml}</div>
      </div>`;
  }).join('');
};

window.renderBasicInfoForm = function(mod) {
  const d = mod.data || {};
  const isLinked = mod.is_global_linked && window.currentRoute !== 'profile';
  const showLinkToggle = window.currentRoute !== 'profile' && ['basic_info', 'education', 'custom'].includes(mod.id);
  const disabledAttr = isLinked ? ' disabled' : '';

  let formHtml = '';
  if (showLinkToggle) {
    formHtml += `
      <div class="global-link-container" style="margin-bottom: 12px; padding: 8px; background: #f3f4f6; border-radius: 6px; display: flex; align-items: center;">
        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px; font-weight: 500; color: #374151; width: 100%;">
          <input type="checkbox" class="global-link-checkbox" data-module="${mod.id}" ${mod.is_global_linked ? 'checked' : ''} onchange="window.toggleLinkGlobal('${mod.id}', this.checked)" style="width: 14px; height: 14px; margin: 0; cursor: pointer;">
          🔗 链接至全局档案
        </label>
      </div>`;
  }

  formHtml += `
    <div class="info-field">
      <label>姓名</label>
      <input${disabledAttr} value="${window.escHtml(window.richTextToPlain(d.name||''))}" placeholder="张三"
        oninput="window.onFieldChange('${mod.id}', 'name', this.value)">
    </div>`;
    
  formHtml += `
    <div class="info-field" style="margin-bottom: 12px;">
      <label>简历照片</label>
      <div style="display:flex;gap:8px;align-items:center">
        ${isLinked ? '' : '<button class="btn-outline btn-sm" onclick="document.getElementById(\'photo-upload-input\').click()">上传照片</button>'}
        ${!isLinked && d.photo ? '<button class="btn-danger btn-sm" onclick="window.removePhoto()">移除照片</button>' : ''}
      </div>
      ${d.photo ? '<div style="margin-top:6px;font-size:11px;color:var(--text-muted)">✓ 已设置照片</div>' : ''}
    </div>`;

  const items = mod.items || [];
  formHtml += items.map((item, idx) => `
    <div class="entry-item" style="padding-bottom: 8px;">
      <div class="entry-item-header" style="margin-bottom: 4px;">
        <input${disabledAttr} style="font-weight:600; width: 100px; padding: 2px 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 11px;" value="${window.escHtml(window.richTextToPlain(item.label||''))}" oninput="window.onItemFieldChange('${mod.id}',${idx},'label',this.value)">
        ${isLinked ? '' : `<button class="btn-xs btn-danger" onclick="window.deleteEntry('${mod.id}',${idx})">删除</button>`}
      </div>
      <div class="entry-row" style="margin-top: 0;">
        <input${disabledAttr} value="${window.escHtml(window.richTextToPlain(item.value||''))}" placeholder="填写内容" oninput="window.onItemFieldChange('${mod.id}',${idx},'value',this.value)">
      </div>
    </div>
  `).join('');

  if (!isLinked) {
    formHtml += `<button class="add-entry-btn" onclick="window.addEntry('${mod.id}')">+ 添加个人信息</button>`;
  }
  return formHtml;
};

window.renderItemsForm = function(mod) {
  const items = mod.items || [];
  const isLinked = mod.is_global_linked && window.currentRoute !== 'profile';
  const showLinkToggle = window.currentRoute !== 'profile' && ['basic_info', 'education', 'custom'].includes(mod.id);
  const disabledAttr = isLinked ? ' disabled' : '';

  let linkToggleHtml = '';
  if (showLinkToggle) {
    linkToggleHtml = `
      <div class="global-link-container" style="margin-bottom: 12px; padding: 8px; background: #f3f4f6; border-radius: 6px; display: flex; align-items: center;">
        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px; font-weight: 500; color: #374151; width: 100%;">
          <input type="checkbox" class="global-link-checkbox" data-module="${mod.id}" ${mod.is_global_linked ? 'checked' : ''} onchange="window.toggleLinkGlobal('${mod.id}', this.checked)" style="width: 14px; height: 14px; margin: 0; cursor: pointer;">
          🔗 链接至全局档案
        </label>
      </div>`;
  }

  if (mod.id === 'custom') {
    let customHtml = linkToggleHtml;
    customHtml += items.map((item, idx) => {
      const bullets = item.bullets || item.details || [''];
      let bulletsHtml = '<div class="entry-bullets">';
      bullets.forEach((b, bi) => {
        bulletsHtml += `<textarea${disabledAttr} placeholder="例如：技能：熟练使用 SQL、Canva、剪映；语言：英语 CET-6 594"
          onkeydown="if(event.key==='Enter' && !event.shiftKey){ event.preventDefault(); window.addBullet('${mod.id}',${idx}); }"
          oninput="window.onBulletChange('${mod.id}',${idx},${bi},this.value)">${window.escHtml(window.richTextToPlain(b))}</textarea>`;
      });
      if (!isLinked) {
        bulletsHtml += `<span class="add-bullet" onclick="window.addBullet('${mod.id}',${idx})">+ 添加一条内容</span>`;
      }
      bulletsHtml += '</div>';

      return `
        <div class="entry-item">
          <div class="entry-item-header">
            <span class="entry-title">其他内容</span>
            ${isLinked ? '' : `<button class="btn-xs btn-danger" onclick="window.deleteEntry('${mod.id}',${idx})">删除</button>`}
          </div>
          ${bulletsHtml}
        </div>`;
    }).join('');
    if (!isLinked) {
      customHtml += `<button class="add-entry-btn" onclick="window.addEntry('${mod.id}')">+ 添加其他内容</button>`;
    }
    return customHtml;
  }

  let html = linkToggleHtml;
  html += items.map((item, idx) => {
    const title = item.title || item.school || item.company || item.project_name || '';
    let fieldsHtml = '';
    if (mod.id === 'education') {
      fieldsHtml = `
        <div class="entry-row">
          <input${disabledAttr} value="${window.escHtml(window.richTextToPlain(item.school||''))}" placeholder="学校名称" oninput="window.onItemFieldChange('${mod.id}',${idx},'school',this.value)">
        </div>
        <div class="entry-row">
          <input${disabledAttr} value="${window.escHtml(window.richTextToPlain(item.major||''))}" placeholder="专业 / 学位" oninput="window.onItemFieldChange('${mod.id}',${idx},'major',this.value)">
          <input${disabledAttr} value="${window.escHtml(window.richTextToPlain(item.time||''))}" placeholder="时间，如 2022.09-2026.06" oninput="window.onItemFieldChange('${mod.id}',${idx},'time',this.value)">
        </div>`;
    } else {
      fieldsHtml = `
        <div class="entry-row">
          <input${disabledAttr} value="${window.escHtml(window.richTextToPlain(item.title||item.project_name||item.company||''))}" placeholder="${mod.id==='project'?'项目名称':'公司/组织名称'}" oninput="window.onItemFieldChange('${mod.id}',${idx},'title',this.value)">
          <input${disabledAttr} value="${window.escHtml(window.richTextToPlain(item.role||item.subtitle||''))}" placeholder="角色/岗位" oninput="window.onItemFieldChange('${mod.id}',${idx},'role',this.value)">
        </div>
        <div class="entry-row">
          <input${disabledAttr} value="${window.escHtml(window.richTextToPlain(item.time||''))}" placeholder="时间，如 2025.06-2025.09" oninput="window.onItemFieldChange('${mod.id}',${idx},'time',this.value)">
        </div>`;
    }

    const bullets = item.bullets || item.details || [];
    let bulletsHtml = '<div class="entry-bullets">';
    bullets.forEach((b, bi) => {
      bulletsHtml += `<textarea${disabledAttr} placeholder="bullet 内容" onkeydown="if(event.key==='Enter' && !event.shiftKey){ event.preventDefault(); window.addBullet('${mod.id}',${idx}); }" oninput="window.onBulletChange('${mod.id}',${idx},${bi},this.value)">${window.escHtml(window.richTextToPlain(b))}</textarea>`;
    });
    if (!isLinked) {
      bulletsHtml += `<span class="add-bullet" onclick="window.addBullet('${mod.id}',${idx})">+ 添加要点</span>`;
    }
    bulletsHtml += '</div>';

    return `
      <div class="entry-item">
        <div class="entry-item-header">
          <span class="entry-title">${window.richTextToPlain(title) || '新条目'}</span>
          ${isLinked ? '' : `<button class="btn-xs btn-danger" onclick="window.deleteEntry('${mod.id}',${idx})">删除</button>`}
        </div>
        ${fieldsHtml}
        ${bulletsHtml}
      </div>`;
  }).join('');

  if (!isLinked) {
    html += `<button class="add-entry-btn" onclick="window.addEntry('${mod.id}')">+ 添加条目</button>`;
  }
  return html;
};

// Panel actions
window.moveModuleUp = function(modId) {
  if (!window.editState) return;
  const modules = window.editState.resume.modules;
  const ordered = Object.values(modules).sort((a,b) => a.order - b.order);
  const idx = ordered.findIndex(m => m.id === modId);
  if (idx <= 0) return;
  const a = ordered[idx-1];
  const b = ordered[idx];
  const tmp = a.order;
  a.order = b.order;
  b.order = tmp;
  window.renderEditorPanels();
  window.renderPreview();
  window.markDirty();
};

window.moveModuleDown = function(modId) {
  if (!window.editState) return;
  const modules = window.editState.resume.modules;
  const ordered = Object.values(modules).sort((a,b) => a.order - b.order);
  const idx = ordered.findIndex(m => m.id === modId);
  if (idx < 0 || idx >= ordered.length - 1) return;
  const a = ordered[idx];
  const b = ordered[idx+1];
  const tmp = a.order;
  a.order = b.order;
  b.order = tmp;
  window.renderEditorPanels();
  window.renderPreview();
  window.markDirty();
};

window.toggleModulePanel = function(modId) {
  const panel = document.querySelector(`.module-panel[data-module="${modId}"]`);
  if (!panel) return;
  const body = panel.querySelector('.module-panel-body');
  const icon = panel.querySelector('.collapse-icon');
  if (!body) return;
  if (body.style.display === 'none') {
    body.style.display = '';
    panel.classList.remove('collapsed');
    panel.classList.add('open');
    if (icon) icon.style.transform = '';
  } else {
    body.style.display = 'none';
    panel.classList.add('collapsed');
    panel.classList.remove('open');
    if (icon) icon.style.transform = 'rotate(-90deg)';
  }
};

window.v6SwapItem = function(modId, idx1, idx2) {
  if (window.currentRoute === 'profile') {
    if (!window.profileEditData) return;
    const items = window.profileEditData[modId].items;
    if (!items || idx1 < 0 || idx2 < 0 || idx1 >= items.length || idx2 >= items.length) return;
    
    const tmp = items[idx1];
    items[idx1] = items[idx2];
    items[idx2] = tmp;
    
    if (window.renderProfileEditor) window.renderProfileEditor();
    window.profileDirty = true;
    return;
  }

  if (!window.editState) return;
  const items = window.editState.resume.modules[modId].items;
  if (!items || idx1 < 0 || idx2 < 0 || idx1 >= items.length || idx2 >= items.length) return;
  
  const tmp = items[idx1];
  items[idx1] = items[idx2];
  items[idx2] = tmp;
  
  window.renderEditorPanels();
  window.renderPreview();
  window.markDirty();
};

// Data handling
window.onFieldChange = function(modId, field, val) {
  if (window.currentRoute === 'profile') {
    if (!window.profileEditData) return;
    const mod = window.profileEditData[modId];
    if (!mod) return;
    mod.data[field] = val;
    window.profileDirty = true;
    return;
  }

  if (!window.editState) return;
  const mod = window.editState.resume.modules[modId];
  if (!mod) return;
  mod.data[field] = val;
  if (field === 'name') {
    const el = document.querySelector('[data-editable="basic_info.name"]');
    if (el) el.innerHTML = window.escHtml(val) || '姓名';
    window.editState.resume.name = val;
  }
  window.renderPreview();
  window.markDirty();
};

window.onItemFieldChange = function(modId, idx, field, val) {
  if (window.currentRoute === 'profile') {
    if (!window.profileEditData) return;
    const mod = window.profileEditData[modId];
    if (!mod || !mod.items[idx]) return;
    mod.items[idx][field] = val;
    if (field === 'title' || field === 'school' || field === 'company' || field === 'project_name') {
      const panel = document.querySelector(`.module-panel[data-module="${modId}"]`);
      if (panel) {
        const titles = panel.querySelectorAll('.entry-title');
        if (titles[idx]) titles[idx].textContent = val || '新条目';
      }
    }
    window.profileDirty = true;
    return;
  }

  if (!window.editState) return;
  const mod = window.editState.resume.modules[modId];
  if (!mod || !mod.items[idx]) return;
  mod.items[idx][field] = val;
  if (field === 'title' || field === 'school' || field === 'company' || field === 'project_name') {
    const panel = document.querySelector(`.module-panel[data-module="${modId}"]`);
    if (panel) {
      const titles = panel.querySelectorAll('.entry-title');
      if (titles[idx]) titles[idx].textContent = val || '新条目';
    }
  }
  window.renderPreview();
  window.markDirty();
};

window.onBulletChange = function(modId, idx, bidx, val) {
  if (window.currentRoute === 'profile') {
    if (!window.profileEditData) return;
    const mod = window.profileEditData[modId];
    if (!mod || !mod.items[idx]) return;
    const arr = mod.items[idx].bullets || mod.items[idx].details;
    if (arr) arr[bidx] = val;
    window.profileDirty = true;
    return;
  }

  if (!window.editState) return;
  const mod = window.editState.resume.modules[modId];
  if (!mod || !mod.items[idx]) return;
  const arr = mod.items[idx].bullets || mod.items[idx].details;
  if (arr) arr[bidx] = val;
  window.renderPreview();
  window.markDirty();
};

window.addEntry = function(modId) {
  if (window.currentRoute === 'profile') {
    if (!window.profileEditData) return;
    const mod = window.profileEditData[modId];
    if (!mod) return;
    if (!mod.items) mod.items = [];
    if (mod.id === 'basic_info') {
      mod.items.push({ label: '新信息', value: '' });
    } else if (mod.id === 'education') {
      mod.items.push({ school: '', major: '', time: '', bullets: [''] });
    } else if (mod.id === 'custom') {
      mod.items.push({ bullets: [''] });
    } else {
      mod.items.push({ title: '', role: '', time: '', bullets: [''] });
    }
    if (window.renderProfileEditor) window.renderProfileEditor();
    window.profileDirty = true;
    return;
  }

  if (!window.editState) return;
  const mod = window.editState.resume.modules[modId];
  if (!mod) return;
  if (!mod.items) mod.items = [];
  if (mod.id === 'basic_info') {
    mod.items.push({ label: '新信息', value: '' });
  } else if (mod.id === 'education') {
    mod.items.push({ school: '', major: '', time: '', bullets: [''] });
  } else if (mod.id === 'custom') {
    mod.items.push({ bullets: [''] });
  } else {
    mod.items.push({ title: '', role: '', time: '', bullets: [''] });
  }
  window.renderEditorPanels();
  window.renderPreview();
  window.markDirty();
};

window.deleteEntry = function(modId, idx) {
  if (window.currentRoute === 'profile') {
    if (!confirm('确定要删除此条目吗？')) return;
    if (!window.profileEditData) return;
    const mod = window.profileEditData[modId];
    if (!mod || !mod.items) return;
    mod.items.splice(idx, 1);
    if (window.renderProfileEditor) window.renderProfileEditor();
    window.profileDirty = true;
    return;
  }

  if (!window.editState) return;
  if (!confirm('确定要删除此条目吗？')) return;
  const mod = window.editState.resume.modules[modId];
  if (!mod || !mod.items) return;
  mod.items.splice(idx, 1);
  window.renderEditorPanels();
  window.renderPreview();
  window.markDirty();
};

window.addBullet = function(modId, idx) {
  if (window.currentRoute === 'profile') {
    if (!window.profileEditData) return;
    const mod = window.profileEditData[modId];
    if (!mod || !mod.items[idx]) return;
    const item = mod.items[idx];
    const arr = item.bullets || item.details;
    if (!arr) { item.bullets = ['']; }
    else { arr.push(''); }
    if (window.renderProfileEditor) window.renderProfileEditor();
    setTimeout(() => {
      const panel = document.querySelector(`.module-panel[data-module="${modId}"]`);
      if (panel) {
        const items = panel.querySelectorAll('.entry-item');
        if (items[idx]) {
          const textareas = items[idx].querySelectorAll('textarea');
          if (textareas.length > 0) {
            textareas[textareas.length - 1].focus();
          }
        }
      }
    }, 50);
    window.profileDirty = true;
    return;
  }

  if (!window.editState) return;
  const mod = window.editState.resume.modules[modId];
  if (!mod || !mod.items[idx]) return;
  const item = mod.items[idx];
  const arr = item.bullets || item.details;
  if (!arr) { item.bullets = ['']; }
  else { arr.push(''); }
  window.renderEditorPanels();
  setTimeout(() => {
    const panel = document.querySelector(`.module-panel[data-module="${modId}"]`);
    if (panel) {
      const items = panel.querySelectorAll('.entry-item');
      if (items[idx]) {
        const textareas = items[idx].querySelectorAll('textarea');
        if (textareas.length > 0) {
          textareas[textareas.length - 1].focus();
        }
      }
    }
  }, 50);
  window.renderPreview();
  window.markDirty();
};

window.removePhoto = function() {
  if (window.currentRoute === 'profile') {
    if (window.profileEditData) {
      const mod = window.profileEditData['basic_info'];
      if (mod && mod.data) {
        mod.data.photo = '';
        if (window.renderProfileEditor) window.renderProfileEditor();
        window.profileDirty = true;
      }
    }
    return;
  }

  if (!window.editState) return;
  const mod = window.editState.resume.modules['basic_info'];
  if (mod && mod.data) {
    mod.data.photo = '';
    window.renderEditorPanels();
    window.renderPreview();
    window.markDirty();
  }
};

window.toggleLinkGlobal = function(modId, checked) {
  if (!window.editState) return;
  const mod = window.editState.resume.modules[modId];
  if (!mod) return;

  if (checked) {
    window.showModal('确认链接全局档案',
      `<p>链接后将使用全局个人档案数据覆写当前简历中该模块的内容，您的本地修改将会被丢弃且不可恢复。</p><p>确定要链接吗？</p>`,
      [
        {
          label: '取消',
          callback: () => {
            window.renderEditorPanels();
          }
        },
        {
          label: '确认链接',
          cls: 'btn-primary',
          callback: () => {
            mod.is_global_linked = true;
            if (window.globalProfile && window.globalProfile[modId]) {
              const globalMod = window.globalProfile[modId];
              if (modId === 'basic_info') {
                mod.data = JSON.parse(JSON.stringify(globalMod.data || {}));
                mod.items = JSON.parse(JSON.stringify(globalMod.items || []));
              } else {
                mod.items = JSON.parse(JSON.stringify(globalMod.items || []));
              }
            }
            window.renderEditorPanels();
            window.renderPreview();
            window.markDirty();
            window.showToast('已链接并同步全局个人档案');
          }
        }
      ]
    );
  } else {
    mod.is_global_linked = false;
    window.renderEditorPanels();
    window.renderPreview();
    window.markDirty();
    window.showToast('已取消链接，保留本地副本');
  }
};

// Preview Enhancements (v6 colors and v10 local formatting)

})();
