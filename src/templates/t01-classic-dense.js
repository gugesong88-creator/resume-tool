window.AppTemplates = window.AppTemplates || {};
window.AppTemplates.T01_classic_dense = {
  id: 'T01_classic_dense', name: '经典高密度型',
  desc: '黑白灰单栏，信息密度高，适合内容丰富的简历。参照北大风格，模块紧凑，时间右对齐。',
  layout: 'single', cssClass: 't01-classic-dense',
  accent: '#1E3A8A', accentLight: '#9CA3AF', bg: '#FFFFFF', text: '#111827', muted: '#4B5563',
  fontName: '24px', fontHead: '15px', fontBody: '13.5px', lineHeight: '1.2',
  textAlign: 'justify', marginY: 12, marginX: 30, moduleSpacing: 0,
  showIcons: false, showAvatar: false, showLogo: false,

  renderHeader(biData, L, escHtml, bi) {
    const { name, photo } = biData;
    const items = bi.items || [];
    let contactParts = items.map((item, idx) => L(idx, item));

    return `<div class="resume-header">
      <div class="resume-header-info">
        <div class="resume-name" data-editable="basic_info.name">${escHtml(name)}</div>
        <div class="resume-contact-lines" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 12px; margin-top: 8px;">
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
