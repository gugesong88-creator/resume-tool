import re
import os

with open('src/templates/index.js', 'r', encoding='utf-8') as f:
    js_content = f.read()

# We'll just define the structural templates directly in Python to write to files,
# since copying from the AST using regex is very error prone and fragile.

t01_js = """window.AppTemplates = window.AppTemplates || {};
window.AppTemplates.T01_classic_dense = {
  id: 'T01_classic_dense', name: '经典高密度型',
  desc: '黑白灰单栏，信息密度高，适合内容丰富的简历。参照北大风格，模块紧凑，时间右对齐。',
  layout: 'single', cssClass: 't01-classic-dense',
  accent: '#374151', accentLight: '#9CA3AF', bg: '#FFFFFF', text: '#111827', muted: '#4B5563',
  fontName: '24px', fontHead: '14px', fontBody: '11px', lineHeight: '1.45',
  showIcons: false, showAvatar: false, showLogo: false,

  renderHeader(biData, L, escHtml) {
    const { name, phone, email, city, intention, gender, age, wechat, linkedin, github, political_status, availability, graduation, photo } = biData;
    let contactParts = [];
    if (phone) contactParts.push('<span class="contact-item"><span class="static-label">电话：</span><span data-editable="basic_info.phone">' + escHtml(phone) + '</span></span>');
    if (email) contactParts.push('<span class="contact-item"><span class="static-label">邮箱：</span><span data-editable="basic_info.email">' + escHtml(email) + '</span></span>');
    if (city) contactParts.push('<span class="contact-item"><span class="static-label">城市：</span><span data-editable="basic_info.city">' + escHtml(city) + '</span></span>');
    if (!phone && !email && !city) contactParts.push('<span class="contact-item"><span class="static-label">电话：</span><span data-editable="basic_info.phone" style="color:#9CA3AF">点击填写</span></span>');
    return `<div class="resume-header">
      <div class="resume-header-info">
        <div class="resume-name" data-editable="basic_info.name">${escHtml(name)}</div>
        <div class="resume-contact-line1">
          <span class="contact-item"><span class="static-label">求职意向：</span><span data-editable="basic_info.intention" style="font-weight:600;${intention ? '' : 'color:#9CA3AF'}">${intention ? escHtml(intention) : '点击填写'}</span></span>
          ${contactParts.length ? contactParts.join('') : ''}
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
"""

t02_js = """window.AppTemplates = window.AppTemplates || {};
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
"""

t03_js = """window.AppTemplates = window.AppTemplates || {};
window.AppTemplates.T03_minimal_ats = {
  id: 'T03_minimal_ats', name: '极简ATS型',
  desc: '黑白灰单栏，无装饰，适合技术/工程岗。参照后端开发简历，多列对齐，技术关键词可加粗。',
  layout: 'single', cssClass: 't03-minimal-ats',
  accent: '#1E3A5F', accentLight: '#CBD5E1', bg: '#FFFFFF', text: '#1F2937', muted: '#4B5563',
  fontName: '22px', fontHead: '13px', fontBody: '10.5px', lineHeight: '1.5',
  showIcons: false, showAvatar: false, showLogo: false,

  renderHeader(biData, L, escHtml) {
    const { name, phone, email, city, intention, gender, age, wechat, linkedin, github, political_status, availability, graduation, photo } = biData;
    let t03Line1Parts = [];
    t03Line1Parts.push(L('gender', '性别', gender, '男/女'));
    if (age) t03Line1Parts.push(L('age', '年龄', age, '年龄'));
    if (phone) t03Line1Parts.push(L('phone', '电话', phone, '点击填写'));
    if (email) t03Line1Parts.push(L('email', '邮箱', email, '点击填写'));
    if (wechat) t03Line1Parts.push(L('wechat', '微信', wechat, '点击填写'));
    if (city) t03Line1Parts.push(L('city', '城市', city, '点击填写'));
    if (political_status) t03Line1Parts.push(L('political_status', '政治面貌', political_status, '中共党员/团员/群众'));
    if (t03Line1Parts.length === 0) t03Line1Parts.push(L('phone', '电话', '', '点击填写'));
    return `<div class="resume-header">
      <div class="resume-header-info">
        <div class="resume-name" data-editable="basic_info.name">${escHtml(name)}</div>
        <div class="resume-contact-line1">
          <span class="contact-item"><span class="static-label">求职意向：</span><span data-editable="basic_info.intention" class="resume-intention" style="${intention ? '' : 'color:#9CA3AF'}">${intention ? escHtml(intention) : '点击填写'}</span></span>
        </div>
        <div class="resume-contact-line2">${t03Line1Parts.join('')}</div>
        <div class="resume-contact-line3">
          ${L('graduation', '毕业时间', graduation, '2026.06')}
          ${L('availability', '到岗时间', availability, '随时到岗')}
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

    let itemHtml = `<table class="exp-table"><tr>`;
    itemHtml += `<td class="col-time" data-editable="${modId}.${idx}.time">${itemTime ? escHtml(itemTime) : '时间'}</td>`;
    itemHtml += `<td class="col-org" data-editable="${modId}.${idx}.title">${escHtml(itemTitle)}</td>`;
    if (itemRole) itemHtml += `<td class="col-role" data-editable="${modId}.${idx}.role">${escHtml(itemRole)}</td>`;
    itemHtml += `</tr></table>`;
    if (bullets.length > 0 || true) {
      const displayBullets = bullets.length > 0 ? bullets : ['点击填写描述'];
      itemHtml += `<ul class="exp-desc" data-editable="${modId}.${idx}._bullets">${displayBullets.map((b) => {
        const kwBold = b.replace(/(Java|SpringBoot|Spring|MyBatis|MySQL|Redis|RabbitMQ|Kafka|Docker|Kubernetes|JWT|OSS|Nginx|Git|Linux|SQL|API|TPS|QPS|RPC|HTTP|HTTPS|TCP|ORM|AOP|IOC|CI\/CD|Jenkins|Maven|Gradle|Elasticsearch|MongoDB|PostgreSQL|Vue|React|Node\.js|Python|Go|Rust|AWS|Azure|微服务|分布式|高并发|缓存|索引|消息队列|异步|负载均衡|熔断|降级|限流)/gi, '<span class="kw">$1</span>');
        return `<li>${kwBold}</li>`;
      }).join('')}</ul>`;
    }
    return itemHtml;
  }
};
"""

t04_js = """window.AppTemplates = window.AppTemplates || {};
window.AppTemplates.T04_business_clean = {
  id: 'T04_business_clean', name: '商务清爽型',
  desc: '留白适中，模块疏朗，适合正式商务风格。在前三个模板基础上降低密度，更注重呼吸感。',
  layout: 'single', cssClass: 't04-business-clean',
  accent: '#2C5282', accentLight: '#BEE3F8', bg: '#FFFFFF', text: '#1F2937', muted: '#6B7280',
  fontName: '26px', fontHead: '15px', fontBody: '11.5px', lineHeight: '1.6',
  showIcons: false, showAvatar: true, showLogo: false,

  renderHeader(biData, L, escHtml) {
    const { name, phone, email, city, intention, gender, age, wechat, linkedin, github, political_status, availability, graduation, photo } = biData;
    let t04ContactParts = [];
    if (phone) t04ContactParts.push('<span class="contact-item"><span class="static-label">电话：</span><span data-editable="basic_info.phone">' + escHtml(phone) + '</span></span>');
    if (email) t04ContactParts.push('<span class="contact-item"><span class="static-label">邮箱：</span><span data-editable="basic_info.email">' + escHtml(email) + '</span></span>');
    if (city) t04ContactParts.push('<span class="contact-item"><span class="static-label">城市：</span><span data-editable="basic_info.city">' + escHtml(city) + '</span></span>');
    if (!phone && !email && !city) t04ContactParts.push('<span class="contact-item"><span class="static-label">电话：</span><span data-editable="basic_info.phone" style="color:#9CA3AF">点击填写</span></span>');
    return `<div class="resume-header">
      <div class="resume-header-info">
        <div class="resume-name" data-editable="basic_info.name">${escHtml(name)}</div>
        <div class="resume-contact-line1">
          <span class="contact-item"><span class="static-label">求职意向：</span><span data-editable="basic_info.intention" style="${intention ? '' : 'color:#9CA3AF'}">${intention ? escHtml(intention) : '点击填写'}</span></span>
          ${t04ContactParts.length ? t04ContactParts.join('') : ''}
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
"""

index_js = """// ============================================================
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

  function L(key, label, value, placeholder, cls) {
    const isEmpty = !value;
    const ph = placeholder || '点击填写';
    return `<span class="contact-item"><span class="static-label">${label}：</span><span data-editable="basic_info.${key}" class="${cls||''}" style="${isEmpty ? 'color:#9CA3AF' : ''}">${isEmpty ? ph : window.escHtml(value)}</span></span>`;
  }

  const templateDef = getTemplate(t.id);
  let html = '';
  
  if (templateDef && templateDef.renderHeader) {
      html += templateDef.renderHeader(biData, L, window.escHtml);
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
      <button onclick="event.preventDefault();event.stopPropagation();addEntry('${modId}')" title="添加条目">+</button>
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
      bodyHtml = `<button class="inline-add-btn" onclick="event.preventDefault();addEntry('${modId}')" contenteditable="false">+ 添加其他内容</button>`;
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
        return `<div class="entry-wrapper">${itemHtml}<button class="entry-delete-btn" onclick="event.preventDefault();event.stopPropagation();deleteEntry('${modId}',${idx})" title="删除此条目" contenteditable="false">×</button></div>`;
      }).join('');
    } else {
      bodyHtml = `<button class="inline-add-btn" onclick="event.preventDefault();addEntry('${modId}')" contenteditable="false">+ 添加条目</button>`;
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
"""

# Write files
with open('src/templates/t01-classic-dense.js', 'w', encoding='utf-8') as f: f.write(t01_js)
with open('src/templates/t02-modern-icon.js', 'w', encoding='utf-8') as f: f.write(t02_js)
with open('src/templates/t03-minimal-ats.js', 'w', encoding='utf-8') as f: f.write(t03_js)
with open('src/templates/t04-business-clean.js', 'w', encoding='utf-8') as f: f.write(t04_js)
with open('src/templates/index.js', 'w', encoding='utf-8') as f: f.write(index_js)

# Update HTML to load these 4 template files before index.js
with open('resume_chatgpt_stable_clean_v9.html', 'r', encoding='utf-8') as f:
    html = f.read()

script_tags = """<script src="./src/templates/t01-classic-dense.js"></script>
<script src="./src/templates/t02-modern-icon.js"></script>
<script src="./src/templates/t03-minimal-ats.js"></script>
<script src="./src/templates/t04-business-clean.js"></script>
<script src="./src/templates/index.js"></script>"""

html = html.replace('<script src="./src/templates/index.js"></script>', script_tags)

with open('resume_chatgpt_stable_clean_v9.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Split templates successfully.")
