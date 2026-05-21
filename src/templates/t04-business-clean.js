window.AppTemplates = window.AppTemplates || {};
window.AppTemplates.T04_business_clean = {
  id: 'T04_business_clean', name: '商务清爽型',
  desc: '留白适中，模块疏朗，适合正式商务风格。在前三个模板基础上降低密度，更注重呼吸感。',
  layout: 'single', cssClass: 't04-business-clean',
  accent: '#2C5282', accentLight: '#BEE3F8', bg: '#FFFFFF', text: '#1F2937', muted: '#6B7280',
  fontName: '26px', fontHead: '15px', fontBody: '11.5px', lineHeight: '1.6',
  showIcons: false, showAvatar: true, showLogo: false,

  renderHeader(biData, L, escHtml, bi) {
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
  renderModuleTitle(title, modId, escHtml) {
    return escHtml(title);
  },

  renderModuleItem(item, modId, idx, escHtml) {
    // Same as T01
    const itemTitle = item.title || item.school || item.company || item.project_name || '点击填写名称';
    const itemRole = item.role || item.subtitle || item.major || '';
    const itemTime = item.time || '';
    const bullets = item.bullets || item.details || [];

    let itemHtml = `<div class="exp-item">`;
    itemHtml += `<div class="exp-header"><span class="exp-left" data-editable="${modId}.${idx}.title">${escHtml(itemTitle)}</span>`;
    itemHtml += `<span class="exp-right" data-editable="${modId}.${idx}.time">${itemTime ? escHtml(itemTime) : '时间'}</span>`;
    itemHtml += `</div>`;
    if (itemRole) itemHtml += `<div class="exp-sub" data-editable="${modId}.${idx}.role">${escHtml(itemRole)}</div>`;
    const displayBullets = bullets.length > 0 ? bullets : ['点击填写描述'];
    itemHtml += `<ul class="exp-desc" data-editable="${modId}.${idx}._bullets">${displayBullets.map((b) =>
      `<li>${b}</li>`
    ).join('')}</ul>`;
    itemHtml += `</div>`;
    return itemHtml;
  }
};
