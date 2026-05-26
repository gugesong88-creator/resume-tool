// ============================================================
// TEMPLATE ENGINE & REGISTRY
// ============================================================

window.AppTemplates = window.AppTemplates || {};

function getTemplate(id) {
  const legacyMap = {
    'T02_modern_sidebar': 'T02_modern_icon',
    'T04_global_clean': 'T04_business_clean'
  };
  const lookupId = legacyMap[id] || id;
  return window.AppTemplates[lookupId] || window.AppTemplates['T01_classic_dense'];
}

// 统一的渲染入口
function renderResumeHTML(t, modules, meta) {
  const bi = modules.basic_info;
  const biData = bi.data || {};

  function L(idx, item, placeholder, cls) {
    const label = item.label || '标签';
    const value = item.value || '';
    const isEmpty = !value;
    const ph = placeholder || '点击填写';
    return `<span class="contact-item ${isEmpty ? 'empty-field' : ''}"><span class="static-label" data-editable="basic_info.items.${idx}.label">${window.escHtml(label)}：</span><span data-editable="basic_info.items.${idx}.value" class="${cls||''}" style="${isEmpty ? 'color:#9CA3AF' : ''}">${isEmpty ? ph : window.escHtml(value)}</span></span>`;
  }

  const templateDef = getTemplate(t.id);
  let html = '';
  
  if (templateDef && templateDef.renderHeader) {
      html += templateDef.renderHeader(biData, L, window.escHtml, bi);
  }

  const visibleModules = Object.values(modules)
    .filter(m => m.visible && m.id !== 'basic_info')
    .sort((a,b) => a.order - b.order);

  visibleModules.forEach(m => {
    html += renderModuleHTML(m, templateDef);
  });

  return html;
}

function renderModuleHTML(mod, templateDef) {
  const title = mod.title || mod.id;
  const modId = mod.id;
  let bodyHtml = '';
  const canDelete = mod.deletable !== false;

  let titleHtml = templateDef.renderModuleTitle ? templateDef.renderModuleTitle(title, modId, window.escHtml) : window.escHtml(title);

  const headerActions = canDelete ? `
    <span class="section-actions" contenteditable="false">
      <button onclick="event.preventDefault();event.stopPropagation();toggleModuleVisible('${modId}')" title="${mod.visible ? '隐藏此模块' : '显示此模块'}">${mod.visible ? '👁' : '👁‍🗨'}</button>
      ${mod.is_global_linked ? '' : `<button onclick="event.preventDefault();event.stopPropagation();addEntry('${modId}')" title="添加条目">+</button>`}
    </span>` : '';

  if (modId === 'custom') {
    const items = mod.items || [];
    const bullets = [];

    items.forEach(item => {
      const arr = item.bullets || item.details || [];
      arr.forEach(b => {
        if (b && String(b).trim()) bullets.push(String(b).trim());
      });
    });

    if (bullets.length > 0) {
      bodyHtml = `
        <ul class="exp-desc" data-editable="custom.0._bullets">
          ${bullets.map(b => `<li>${b}</li>`).join('')}
        </ul>`;
    } else {
      bodyHtml = mod.is_global_linked ? '' : `<button class="inline-add-btn" onclick="event.preventDefault();addEntry('${modId}')" contenteditable="false">+ 添加其他内容</button>`;
    }

    return `
      <div class="section">
        <div class="section-header">
          <div class="section-title" data-editable="${modId}._title">${titleHtml}</div>
          ${headerActions}
        </div>
        ${bodyHtml}
      </div>`;
  }

  if (mod.items) {
    const items = mod.items || [];
    if (items.length > 0) {
      bodyHtml = items.map((item, idx) => {
        let itemHtml = templateDef.renderModuleItem ? templateDef.renderModuleItem(item, modId, idx, window.escHtml) : '';
        return `<div class="entry-wrapper">${itemHtml}${mod.is_global_linked ? '' : `<button class="entry-delete-btn" onclick="event.preventDefault();event.stopPropagation();deleteEntry('${modId}',${idx})" title="删除此条目" contenteditable="false">×</button>`}</div>`;
      }).join('');
    } else {
      bodyHtml = mod.is_global_linked ? '' : `<button class="inline-add-btn" onclick="event.preventDefault();addEntry('${modId}')" contenteditable="false">+ 添加条目</button>`;
    }
  }

  return `
    <div class="section">
      <div class="section-header">
        <div class="section-title" data-editable="${modId}._title">${titleHtml}</div>
        ${headerActions}
      </div>
      ${bodyHtml}
    </div>`;
}

// Expose globally for legacy code compatibility
window.getTemplate = getTemplate;
window.renderResumeHTML = renderResumeHTML;
window.renderModuleHTML = renderModuleHTML;

// 保证遗留代码兼容，注入一个 TEMPLATES 数组供 getTemplate 以外的场景读取
Object.defineProperty(window, 'TEMPLATES', {
    get: function() {
        return Object.values(window.AppTemplates);
    }
});
