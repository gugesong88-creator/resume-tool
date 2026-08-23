import type { ResumeDocument, ResumeModuleItem } from '../../types/resume';

interface RenderableModule {
  id: string;
  title: string;
  order?: number;
  visible: boolean;
  deletable?: boolean;
  is_global_linked?: boolean;
  data?: Record<string, unknown>;
  items?: ResumeModuleItem[];
}

interface RendererRuntime extends Window {
  currentRoute: string;
  editState: { resume: ResumeDocument } | null;
  escHtml: (value: string) => string;
  richTextToPlain: (value: unknown) => string;
}

const runtime = window as unknown as RendererRuntime;
const GLOBAL_LINK_MODULES = new Set(['basic_info', 'education', 'custom']);

function plain(value: unknown): string {
  return runtime.richTextToPlain(value ?? '');
}

function escaped(value: unknown): string {
  return runtime.escHtml(plain(value));
}

function firstValue(...values: unknown[]): unknown {
  return values.find(Boolean) ?? '';
}

function isLinked(module: RenderableModule): boolean {
  return Boolean(module.is_global_linked && runtime.currentRoute !== 'profile');
}

function renderSortControl(module: RenderableModule): string {
  const items = module.items || [];
  if (items.length < 2 || isLinked(module)) return '';

  const controls = items.map((item, index) => {
    const title = firstValue(item.title, item.company, item.school, item.project_name, `条目${index + 1}`);
    const snippet = escaped(title).substring(0, 6);
    return `<div style="display:flex; align-items:center; background:#fff; border:1px solid #C7D2FE; border-radius:4px; padding:2px; font-size:11px;">
      <span style="padding:0 4px;">${index + 1}.${snippet}</span>
      ${index > 0 ? `<button data-entry-action="swap" data-module="${module.id}" data-entry-index="${index}" data-swap-target="${index - 1}" style="border:none;background:none;cursor:pointer;color:#4F46E5;padding:0 2px;" title="前移">←</button>` : ''}
      ${index < items.length - 1 ? `<button data-entry-action="swap" data-module="${module.id}" data-entry-index="${index}" data-swap-target="${index + 1}" style="border:none;background:none;cursor:pointer;color:#4F46E5;padding:0 2px;" title="后移">→</button>` : ''}
    </div>`;
  }).join('');

  return `<div class="v6-enhance-box" style="margin: 8px 0; padding: 8px; border: 1px dashed #D1D5DB; border-radius: 8px; background: #EEF2FF;">
    <div style="font-size: 12px; font-weight: 600; margin-bottom: 6px; color: #374151;">条目快速排序 (交换位置)</div>
    <div style="display:flex; flex-wrap:wrap; gap: 4px;">${controls}</div>
  </div>`;
}

function renderGlobalLinkToggle(module: RenderableModule): string {
  if (runtime.currentRoute === 'profile' || !GLOBAL_LINK_MODULES.has(module.id)) return '';
  return `<div class="global-link-container" style="margin-bottom: 12px; padding: 8px; background: #f3f4f6; border-radius: 6px; display: flex; align-items: center;">
    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px; font-weight: 500; color: #374151; width: 100%;">
      <input type="checkbox" class="global-link-checkbox" data-link-global data-module="${module.id}" ${module.is_global_linked ? 'checked' : ''} style="width: 14px; height: 14px; margin: 0; cursor: pointer;">
      🔗 链接至全局档案
    </label>
  </div>`;
}

function renderBulletFields(module: RenderableModule, item: ResumeModuleItem, itemIndex: number): string {
  const disabled = isLinked(module) ? ' disabled' : '';
  const bullets = item.bullets || item.details || [];
  const fields = bullets.map((bullet, bulletIndex) =>
    `<textarea${disabled} placeholder="bullet 内容" data-module="${module.id}" data-entry-index="${itemIndex}" data-bullet-index="${bulletIndex}" data-bullet-field>${escaped(bullet)}</textarea>`
  ).join('');
  const addButton = isLinked(module)
    ? ''
    : `<span class="add-bullet" data-entry-action="add-bullet" data-module="${module.id}" data-entry-index="${itemIndex}">+ 添加要点</span>`;
  return `<div class="entry-bullets">${fields}${addButton}</div>`;
}

function renderCustomItems(module: RenderableModule): string {
  const disabled = isLinked(module) ? ' disabled' : '';
  const items = module.items || [];
  const entries = items.map((item, itemIndex) => {
    const bullets = item.bullets || item.details || [''];
    const fields = bullets.map((bullet, bulletIndex) =>
      `<textarea${disabled} placeholder="例如：技能：熟练使用 SQL、Canva、剪映；语言：英语 CET-6 594" data-module="${module.id}" data-entry-index="${itemIndex}" data-bullet-index="${bulletIndex}" data-bullet-field>${escaped(bullet)}</textarea>`
    ).join('');
    const addBullet = isLinked(module)
      ? ''
      : `<span class="add-bullet" data-entry-action="add-bullet" data-module="${module.id}" data-entry-index="${itemIndex}">+ 添加一条内容</span>`;
    const deleteButton = isLinked(module)
      ? ''
      : `<button class="btn-xs btn-danger" data-entry-action="delete" data-module="${module.id}" data-entry-index="${itemIndex}">删除</button>`;
    return `<div class="entry-item">
      <div class="entry-item-header"><span class="entry-title">其他内容</span>${deleteButton}</div>
      <div class="entry-bullets">${fields}${addBullet}</div>
    </div>`;
  }).join('');
  const addEntry = isLinked(module)
    ? ''
    : `<button class="add-entry-btn" data-entry-action="add" data-module="${module.id}">+ 添加其他内容</button>`;
  return entries + addEntry;
}

export function renderBasicInfoForm(module: RenderableModule): string {
  const data = module.data || {};
  const disabled = isLinked(module) ? ' disabled' : '';
  const photo = data.photo;
  const items = module.items || [];
  const entries = items.map((item, index) => `<div class="entry-item" style="padding-bottom: 8px;">
    <div class="entry-item-header" style="margin-bottom: 4px;">
      <input${disabled} style="font-weight:600; width: 100px; padding: 2px 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 11px;" value="${escaped(item.label)}" data-module="${module.id}" data-entry-index="${index}" data-item-field="label">
      ${isLinked(module) ? '' : `<button class="btn-xs btn-danger" data-entry-action="delete" data-module="${module.id}" data-entry-index="${index}">删除</button>`}
    </div>
    <div class="entry-row" style="margin-top: 0;">
      <input${disabled} value="${escaped(item.value)}" placeholder="填写内容" data-module="${module.id}" data-entry-index="${index}" data-item-field="value">
    </div>
  </div>`).join('');

  return `${renderGlobalLinkToggle(module)}
    <div class="info-field">
      <label>姓名</label>
      <input${disabled} value="${escaped(data.name)}" placeholder="张三" data-module="${module.id}" data-module-field="name">
    </div>
    <div class="info-field" style="margin-bottom: 12px;">
      <label>简历照片</label>
      <div style="display:flex;gap:8px;align-items:center">
        ${isLinked(module) ? '' : '<button class="btn-outline btn-sm" data-photo-action="upload">上传照片</button>'}
        ${!isLinked(module) && photo ? '<button class="btn-danger btn-sm" data-photo-action="remove">移除照片</button>' : ''}
      </div>
      ${photo ? '<div style="margin-top:6px;font-size:11px;color:var(--text-muted)">✓ 已设置照片</div>' : ''}
    </div>
    ${entries}
    ${isLinked(module) ? '' : `<button class="add-entry-btn" data-entry-action="add" data-module="${module.id}">+ 添加个人信息</button>`}`;
}

export function renderItemsForm(module: RenderableModule): string {
  if (module.id === 'custom') return renderGlobalLinkToggle(module) + renderCustomItems(module);

  const disabled = isLinked(module) ? ' disabled' : '';
  const entries = (module.items || []).map((item, index) => {
    const title = firstValue(item.title, item.school, item.company, item.project_name);
    const fields = module.id === 'education'
      ? `<div class="entry-row">
          <input${disabled} value="${escaped(item.school)}" placeholder="学校名称" data-module="${module.id}" data-entry-index="${index}" data-item-field="school">
        </div>
        <div class="entry-row">
          <input${disabled} value="${escaped(item.major)}" placeholder="专业 / 学位" data-module="${module.id}" data-entry-index="${index}" data-item-field="major">
          <input${disabled} value="${escaped(item.time)}" placeholder="时间，如 2022.09-2026.06" data-module="${module.id}" data-entry-index="${index}" data-item-field="time">
        </div>`
      : `<div class="entry-row">
          <input${disabled} value="${escaped(firstValue(item.title, item.project_name, item.company))}" placeholder="${module.id === 'project' ? '项目名称' : '公司/组织名称'}" data-module="${module.id}" data-entry-index="${index}" data-item-field="title">
          <input${disabled} value="${escaped(firstValue(item.role, item.subtitle))}" placeholder="角色/岗位" data-module="${module.id}" data-entry-index="${index}" data-item-field="role">
        </div>
        <div class="entry-row">
          <input${disabled} value="${escaped(item.time)}" placeholder="时间，如 2025.06-2025.09" data-module="${module.id}" data-entry-index="${index}" data-item-field="time">
        </div>`;
    const deleteButton = isLinked(module)
      ? ''
      : `<button class="btn-xs btn-danger" data-entry-action="delete" data-module="${module.id}" data-entry-index="${index}">删除</button>`;
    return `<div class="entry-item">
      <div class="entry-item-header"><span class="entry-title">${plain(title) || '新条目'}</span>${deleteButton}</div>
      ${fields}
      ${renderBulletFields(module, item, index)}
    </div>`;
  }).join('');

  return `${renderGlobalLinkToggle(module)}${entries}${isLinked(module) ? '' : `<button class="add-entry-btn" data-entry-action="add" data-module="${module.id}">+ 添加条目</button>`}`;
}

export function renderEditorPanels(): void {
  const modules = runtime.editState?.resume.modules;
  const container = document.getElementById('editor-left-panel');
  if (!modules || !container) return;

  const ordered = Object.values(modules).sort((left, right) => left.order - right.order);
  container.innerHTML = ordered.map(module => {
    const body = renderSortControl(module)
      + (module.id === 'basic_info' ? renderBasicInfoForm(module) : renderItemsForm(module));
    const collapsed = !module.visible && module.deletable;
    const status = !module.deletable
      ? '<span class="panel-tag required">必选</span>'
      : !module.visible ? '<span class="panel-tag hidden-tag">已隐藏</span>' : '';
    const actions = module.deletable ? `<button class="btn-xs btn-reorder" data-module-action="move-up" data-module="${module.id}" title="上移">↑</button>
      <button class="btn-xs btn-reorder" data-module-action="move-down" data-module="${module.id}" title="下移">↓</button>
      <button class="btn-xs btn-outline" data-module-action="toggle-visible" data-module="${module.id}" title="${module.visible ? '隐藏' : '显示'}">${module.visible ? '👁' : '👁‍🗨'}</button>
      <button class="btn-xs btn-danger" data-module-action="delete" data-module="${module.id}" title="删除">✕</button>` : '';

    return `<div class="module-panel ${collapsed ? 'collapsed' : 'open'} ${module.visible ? '' : 'hidden-module'}" data-module="${module.id}">
      <div class="module-panel-header" data-module-action="toggle-panel" data-module="${module.id}">
        <div class="module-panel-title">
          <span class="collapse-icon">▼</span>
          <span data-editable-module-title="${module.id}">${escaped(module.title)}</span>${status}
        </div>
        <div class="module-panel-actions">${actions}</div>
      </div>
      <div class="module-panel-body">${body}</div>
    </div>`;
  }).join('');
}

Object.assign(window, {
  renderEditorPanels,
  renderBasicInfoForm,
  renderItemsForm
});
