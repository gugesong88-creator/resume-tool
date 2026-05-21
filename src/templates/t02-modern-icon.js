window.AppTemplates = window.AppTemplates || {};
window.AppTemplates.T02_modern_icon = {
  id: 'T02_modern_icon', name: '现代图标型',
  desc: '模块标题带青蓝色图标和强调线，适合AI/产品/项目型简历。参照清华风格，bullet关键词加粗。',
  layout: 'single', cssClass: 't02-modern-icon',
  accent: '#0D9488', accentLight: '#99F6E4', bg: '#FFFFFF', text: '#111827', muted: '#4B5563',
  fontName: '24px', fontHead: '14px', fontBody: '11px', lineHeight: '1.55',
  showIcons: true, showAvatar: true, showLogo: true,

  renderHeader(biData, L, escHtml) {
    const { name, phone, email, city, intention, gender, age, wechat, linkedin, github, political_status, availability, graduation, photo } = biData;
    let t02ContactParts = [];
    if (phone) t02ContactParts.push('<span class="contact-item"><span class="static-label">电话：</span><span data-editable="basic_info.phone">' + escHtml(phone) + '</span></span>');
    if (email) t02ContactParts.push('<span class="contact-item"><span class="static-label">邮箱：</span><span data-editable="basic_info.email">' + escHtml(email) + '</span></span>');
    if (wechat) t02ContactParts.push('<span class="contact-item"><span class="static-label">微信：</span><span data-editable="basic_info.wechat">' + escHtml(wechat) + '</span></span>');
    if (city) t02ContactParts.push('<span class="contact-item"><span class="static-label">城市：</span><span data-editable="basic_info.city">' + escHtml(city) + '</span></span>');
    if (!phone && !email && !wechat && !city) t02ContactParts.push('<span class="contact-item"><span class="static-label">电话：</span><span data-editable="basic_info.phone" style="color:#9CA3AF">点击填写</span></span>');
    return `<div class="resume-header">
      <div class="resume-header-left">
        <div class="resume-name" data-editable="basic_info.name">${escHtml(name)}</div>
        <div class="resume-contact-line1">
          <span class="contact-item"><span class="static-label">求职意向：</span><span data-editable="basic_info.intention" style="${intention ? '' : 'color:#9CA3AF'}">${intention ? escHtml(intention) : '点击填写'}</span></span>
          ${t02ContactParts.length ? t02ContactParts.join('') : ''}
        </div>
        <div class="resume-contact-line2">
          ${L('gender', '性别', gender, '男/女')} ${L('age', '年龄', age, '年龄')}
          ${L('political_status', '政治面貌', political_status, '中共党员/团员/群众')}
        </div>
        <div class="resume-contact-line3">
          ${L('graduation', '毕业时间', graduation, '2026.06')}
          ${L('availability', '到岗时间', availability, '随时到岗')}
        </div>
      </div>
      <div class="resume-header-right">
        <div class="resume-header-logo" data-editable="basic_info._logo">🏫<br>学校</div>
        ${photo ? `<div class="resume-header-photo"><img src="${escHtml(photo)}" alt="照片" onerror="this.style.display='none'"></div>` : `<div class="resume-header-photo resume-photo-placeholder" data-editable="basic_info._photo">📷<br>照片</div>`}
      </div>
    </div>`;
  },

  renderModuleTitle(title, modId, escHtml) {
    const MODULE_ICONS = { education: '🎓', internship: '💼', project: '📋', custom: '📌' };
    const icon = MODULE_ICONS[modId] || '📄';
    return `<span class="section-icon" contenteditable="false">${icon}</span>${escHtml(title)}`;
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
    itemHtml += `<ul class="exp-desc" data-editable="${modId}.${idx}._bullets">${displayBullets.map((b) => {
      const kwBold = b.replace(/^([^：:]+[：:])/, '<span class="kw">$1</span>');
      return `<li>${kwBold}</li>`;
    }).join('')}</ul>`;
    itemHtml += `</div>`;
    return itemHtml;
  }
};
