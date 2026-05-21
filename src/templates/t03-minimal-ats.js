window.AppTemplates = window.AppTemplates || {};
window.AppTemplates.T03_minimal_ats = {
  id: 'T03_minimal_ats', name: '极简ATS型',
  desc: '黑白灰单栏，无装饰，适合技术/工程岗。参照后端开发简历，多列对齐，技术关键词可加粗。',
  layout: 'single', cssClass: 't03-minimal-ats',
  accent: '#1E3A5F', accentLight: '#CBD5E1', bg: '#FFFFFF', text: '#1F2937', muted: '#4B5563',
  fontName: '22px', fontHead: '13px', fontBody: '10.5px', lineHeight: '1.5',
  showIcons: false, showAvatar: false, showLogo: false,

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
