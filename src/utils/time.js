function uuid() {
  return 'res_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN');
}

// 掛載到全局以兼容舊代码
window.uuid = uuid;
window.formatTime = formatTime;
window.formatDate = formatDate;
