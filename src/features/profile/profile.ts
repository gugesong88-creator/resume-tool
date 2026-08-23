import type { GlobalProfile, ProfileModule, ResumeFormatting, ResumeModuleItem } from '../../types/resume';
import { deepCopy } from '../../utils/clone';
import { getGlobalProfile, saveGlobalProfileData } from '../../data/profile-repository';
import { configureEditableElement } from '../editor/rich-text-editor';

interface ProfileRuntime extends Window {
  profileEditData: GlobalProfile | null;
  profileDirty: boolean;
  globalProfile?: GlobalProfile;
  editState?: {
    formatting?: Partial<ResumeFormatting>;
    resume?: { template_id?: string; meta?: Record<string, unknown> };
  } | null;
  renderBasicInfoForm: (module: ProfileModule) => string;
  renderItemsForm: (module: ProfileModule) => string;
  getTemplate: (id: string) => {
    id: string;
    cssClass: string;
    accent?: string;
  };
  renderResumeHTML: (
    template: unknown,
    modules: Record<string, ProfileModule>,
    meta: Record<string, unknown>
  ) => string;
  decodeEscapedRichTextInPreview: (root: HTMLElement) => void;
  applyFormattingToElements: (canvas: HTMLElement, formatting: ResumeFormatting) => void;
  sanitizeRichHtml: (value: string) => string;
  richTextToPlain: (value: string) => string;
  showToast: (message: string) => void;
}

const runtime = window as unknown as ProfileRuntime;
const EMPTY_FORMATTING: ResumeFormatting = {
  fontFamily: 'default',
  nameSize: 24,
  headingSize: 14,
  bodySize: 11,
  lineHeight: 1.5,
  textAlign: 'left',
  marginY: 48,
  marginX: 52,
  moduleSpacing: 8,
  themeColor: '#374151'
};
const EMPTY_PLACEHOLDERS = new Set([
  '点击填写',
  '年龄',
  '男/女',
  '中共党员/团员/群众',
  '随时到岗',
  '2026.06',
  '时间'
]);

let profileDirty = false;

export function updateProfileSaveStatus(): void {
  const status = document.getElementById('profile-save-status');
  if (!status) return;
  status.textContent = profileDirty ? '未保存' : '已保存';
  status.className = `save-status ${profileDirty ? 'unsaved' : 'saved'}`;
}

Object.defineProperty(window, 'profileDirty', {
  configurable: true,
  get: () => profileDirty,
  set: value => {
    profileDirty = Boolean(value);
    updateProfileSaveStatus();
  }
});

export function initProfileEditor(): void {
  const profile = getGlobalProfile();
  runtime.profileEditData = deepCopy(profile);
  runtime.globalProfile = profile;
  runtime.profileDirty = false;
  renderProfileEditor();
  renderProfilePreview();
}

function profilePanel(moduleId: string, title: string, body: string): string {
  return `<div class="module-panel open" data-module="${moduleId}" style="margin-bottom:16px;">
    <div class="module-panel-header" data-profile-panel-toggle>
      <span class="module-panel-title">
        <span class="collapse-icon">▼</span>
        ${title}
      </span>
    </div>
    <div class="module-panel-body">${body}</div>
  </div>`;
}

export function renderProfileEditor(): void {
  const container = document.getElementById('profile-editor-left');
  const profile = runtime.profileEditData;
  if (!container || !profile) return;

  container.innerHTML = [
    profilePanel('basic_info', '👤 全局个人信息', runtime.renderBasicInfoForm(profile.basic_info)),
    profilePanel('education', '🎓 全局教育经历', runtime.renderItemsForm(profile.education)),
    profilePanel('custom', '✨ 全局其他内容', runtime.renderItemsForm(profile.custom))
  ].join('');
}

export function saveGlobalProfile(): void {
  if (!runtime.profileEditData) return;
  saveGlobalProfileData(runtime.profileEditData);
  runtime.profileDirty = false;
  runtime.showToast('全局个人档案保存成功，已同步至所有关联的简历');
}

export function renderProfilePreview(): void {
  const profile = runtime.profileEditData;
  const canvas = document.getElementById('profile-a4-preview');
  if (!profile || !canvas) return;

  const template = runtime.getTemplate('T01_classic_dense');
  const meta = runtime.editState?.resume?.meta || {};
  canvas.className = `a4-canvas ${template.cssClass}`;
  canvas.innerHTML = runtime.renderResumeHTML(template, {
    basic_info: profile.basic_info,
    education: profile.education,
    custom: profile.custom
  }, meta);
  runtime.decodeEscapedRichTextInPreview(canvas);
  applyProfileFormatting();
  attachProfileEditableHandlers(canvas);
}

export function applyProfileFormatting(): void {
  const canvas = document.getElementById('profile-a4-preview');
  if (!canvas) return;

  const formatting: ResumeFormatting = {
    ...EMPTY_FORMATTING,
    ...(runtime.editState?.formatting || {})
  };
  if (formatting.fontFamily !== 'default') {
    canvas.style.setProperty('--fmt-font-family', formatting.fontFamily);
  } else {
    canvas.style.removeProperty('--fmt-font-family');
  }
  canvas.style.setProperty('--fmt-name-size', `${formatting.nameSize}px`);
  canvas.style.setProperty('--fmt-heading-size', `${formatting.headingSize}px`);
  canvas.style.setProperty('--fmt-body-size', `${formatting.bodySize}px`);
  canvas.style.setProperty('--fmt-line-height', String(formatting.lineHeight));
  canvas.style.setProperty('--fmt-text-align', formatting.textAlign);
  canvas.style.padding = `${formatting.marginY}px ${formatting.marginX}px`;
  canvas.querySelectorAll<HTMLElement>('.section').forEach(section => {
    section.style.marginTop = `${formatting.moduleSpacing}px`;
  });
  runtime.applyFormattingToElements(canvas, formatting);

  const templateId = runtime.editState?.resume?.template_id || 'T01_classic_dense';
  const template = runtime.getTemplate(templateId);
  canvas.style.setProperty('--accent', formatting.themeColor || template.accent || '#374151');
}

export function attachProfileEditableHandlers(canvas: HTMLElement): void {
  canvas.querySelectorAll<HTMLElement>('[data-editable]').forEach(element => {
    const path = element.dataset.editable;
    if (!path || element.contentEditable === 'false') return;

    if (path === 'basic_info._photo') {
      element.addEventListener('click', event => {
        event.preventDefault();
        document.getElementById('photo-upload-input')?.click();
      });
      return;
    }

    configureEditableElement(element, onProfileEditableBlur);
  });
}

function finishProfileEdit(): void {
  renderProfileEditor();
  renderProfilePreview();
  runtime.profileDirty = true;
}

function sanitizedEditableValue(element: HTMLElement): { html: string; text: string } {
  const html = runtime.sanitizeRichHtml(element.innerHTML.trim());
  return { html, text: runtime.richTextToPlain(html).trim() };
}

export function onProfileEditableBlur(event: FocusEvent): void {
  const element = event.target as HTMLElement | null;
  const profile = runtime.profileEditData;
  const path = element?.dataset.editable;
  if (!element || !profile || !path) return;

  element.style.outline = '';
  element.style.outlineOffset = '';
  const parts = path.split('.');
  const moduleId = parts[0];
  const module = profile[moduleId];
  if (!module) return;

  let { html, text } = sanitizedEditableValue(element);
  if (path.endsWith('._title')) {
    const clone = element.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.section-icon, .section-actions').forEach(node => node.remove());
    ({ html, text } = sanitizedEditableValue(clone));
    module.title = html || text || module.title;
    finishProfileEdit();
    return;
  }

  if (moduleId === 'basic_info') {
    module.data ||= {};
    if (EMPTY_PLACEHOLDERS.has(text)) {
      html = '';
      text = '';
    }
    if (parts[1] === 'name') {
      module.data.name = html || text;
    } else if (parts[1] === 'items') {
      const item = module.items[Number(parts[2])];
      if (item && parts[3]) item[parts[3]] = html || text;
    }
    finishProfileEdit();
    return;
  }

  const itemIndex = Number(parts[1]);
  const item = module.items[itemIndex];
  if (!Number.isInteger(itemIndex) || !item) return;
  const key = parts[2];

  if (key === '_bullets') {
    const listItems = Array.from(element.querySelectorAll('li'))
      .map(listItem => runtime.sanitizeRichHtml(listItem.innerHTML.trim()))
      .filter(Boolean);
    if (!listItems.length) {
      const fallback = runtime.sanitizeRichHtml(element.innerHTML.trim());
      if (runtime.richTextToPlain(fallback).trim()) listItems.push(fallback);
    }
    if (moduleId === 'custom') {
      module.items = listItems.map(value => ({ bullets: [value] }));
    } else {
      item.bullets = listItems.length ? listItems : [''];
    }
    finishProfileEdit();
    return;
  }

  if (key === 'bullet') {
    const bulletIndex = Number(parts[3]);
    const bullets = item.bullets || item.details || [];
    if (bulletIndex >= 0 && bulletIndex < bullets.length) {
      item.bullets ||= item.details || [];
      item.bullets[bulletIndex] = html || text;
    }
    finishProfileEdit();
    return;
  }

  if (key) item[key] = html || text;
  finishProfileEdit();
}

document.addEventListener('click', event => {
  const header = (event.target as Element | null)?.closest<HTMLElement>('[data-profile-panel-toggle]');
  if (!header) return;
  const panel = header.closest<HTMLElement>('.module-panel');
  const body = panel?.querySelector<HTMLElement>('.module-panel-body');
  const icon = panel?.querySelector<HTMLElement>('.collapse-icon');
  if (!panel || !body) return;
  const collapsed = body.style.display === 'none';
  body.style.display = collapsed ? '' : 'none';
  panel.classList.toggle('collapsed', !collapsed);
  panel.classList.toggle('open', collapsed);
  if (icon) icon.style.transform = collapsed ? '' : 'rotate(-90deg)';
});

Object.assign(window, {
  getGlobalProfile,
  saveGlobalProfileData,
  initProfileEditor,
  updateProfileSaveStatus,
  renderProfileEditor,
  saveGlobalProfile,
  renderProfilePreview,
  applyProfileFormatting,
  attachProfileEditableHandlers,
  onProfileEditableBlur
});
