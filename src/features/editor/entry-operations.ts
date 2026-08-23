import type { ResumeDocument, ResumeModuleItem } from '../../types/resume';

interface EditableModule {
  id: string;
  data?: Record<string, unknown>;
  items?: ResumeModuleItem[];
}

type EditableModules = Record<string, EditableModule>;

interface EditorRuntime extends Window {
  currentRoute: string;
  profileEditData: EditableModules | null;
  profileDirty: boolean;
  editState: { resume: ResumeDocument } | null;
  renderProfileEditor?: () => void;
  renderProfilePreview?: () => void;
  renderEditorPanels: () => void;
  renderPreview: () => void;
  markDirty: () => void;
  escHtml: (value: string) => string;
}

const runtime = window as unknown as EditorRuntime;
const TITLE_FIELDS = new Set(['title', 'school', 'company', 'project_name']);

function getActiveModules(): EditableModules | null {
  if (runtime.currentRoute === 'profile') return runtime.profileEditData;
  return runtime.editState?.resume.modules as EditableModules | undefined || null;
}

function getModule(moduleId: string): EditableModule | null {
  return getActiveModules()?.[moduleId] || null;
}

function finishMutation(options: { renderForm?: boolean; focus?: () => void } = {}): void {
  const renderForm = options.renderForm !== false;
  if (runtime.currentRoute === 'profile') {
    if (renderForm) runtime.renderProfileEditor?.();
    runtime.renderProfilePreview?.();
    runtime.profileDirty = true;
  } else {
    if (renderForm) runtime.renderEditorPanels();
    runtime.renderPreview();
    runtime.markDirty();
  }

  if (options.focus) setTimeout(options.focus, 50);
}

function createEntry(moduleId: string): ResumeModuleItem {
  if (moduleId === 'basic_info') return { label: '新信息', value: '' };
  if (moduleId === 'education') return { school: '', major: '', time: '', bullets: [''] };
  if (moduleId === 'custom') return { bullets: [''] };
  return { title: '', role: '', time: '', bullets: [''] };
}

function updateEntryTitle(moduleId: string, itemIndex: number, value: string): void {
  const containerId = runtime.currentRoute === 'profile' ? 'profile-editor-left' : 'editor-left-panel';
  const panel = document.querySelector(`#${containerId} .module-panel[data-module="${CSS.escape(moduleId)}"]`);
  const title = panel?.querySelectorAll<HTMLElement>('.entry-title')[itemIndex];
  if (title) title.textContent = value || '新条目';
}

function focusLastBullet(moduleId: string, itemIndex: number): void {
  const containerId = runtime.currentRoute === 'profile' ? 'profile-editor-left' : 'editor-left-panel';
  const panel = document.querySelector(`#${containerId} .module-panel[data-module="${CSS.escape(moduleId)}"]`);
  const item = panel?.querySelectorAll<HTMLElement>('.entry-item')[itemIndex];
  const textareas = item?.querySelectorAll<HTMLTextAreaElement>('textarea');
  textareas?.[textareas.length - 1]?.focus();
}

export function swapEntries(moduleId: string, fromIndex: number, toIndex: number): void {
  const items = getModule(moduleId)?.items;
  if (!items || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) return;
  [items[fromIndex], items[toIndex]] = [items[toIndex], items[fromIndex]];
  finishMutation();
}

export function updateModuleField(moduleId: string, field: string, value: string): void {
  const module = getModule(moduleId);
  if (!module) return;
  module.data ||= {};
  module.data[field] = value;

  if (runtime.currentRoute !== 'profile' && field === 'name' && runtime.editState) {
    const previewName = document.querySelector<HTMLElement>('[data-editable="basic_info.name"]');
    if (previewName) previewName.innerHTML = runtime.escHtml(value) || '姓名';
    runtime.editState.resume.name = value;
  }
  finishMutation({ renderForm: false });
}

export function updateItemField(
  moduleId: string,
  itemIndex: number,
  field: string,
  value: string
): void {
  const item = getModule(moduleId)?.items?.[itemIndex];
  if (!item) return;
  item[field] = value;
  if (TITLE_FIELDS.has(field)) updateEntryTitle(moduleId, itemIndex, value);
  finishMutation({ renderForm: false });
}

export function updateBullet(
  moduleId: string,
  itemIndex: number,
  bulletIndex: number,
  value: string
): void {
  const item = getModule(moduleId)?.items?.[itemIndex];
  if (!item) return;
  const bullets = item.bullets || item.details;
  if (!bullets || bulletIndex < 0 || bulletIndex >= bullets.length) return;
  bullets[bulletIndex] = value;
  finishMutation({ renderForm: false });
}

export function addEntry(moduleId: string): void {
  const module = getModule(moduleId);
  if (!module) return;
  module.items ||= [];
  module.items.push(createEntry(module.id));
  finishMutation();
}

export function deleteEntry(moduleId: string, itemIndex: number): void {
  const items = getModule(moduleId)?.items;
  if (!items?.[itemIndex] || !window.confirm('确定要删除此条目吗？')) return;
  items.splice(itemIndex, 1);
  finishMutation();
}

export function addBullet(moduleId: string, itemIndex: number): void {
  const item = getModule(moduleId)?.items?.[itemIndex];
  if (!item) return;
  const bullets = item.bullets || item.details;
  if (bullets) bullets.push('');
  else item.bullets = [''];
  finishMutation({ focus: () => focusLastBullet(moduleId, itemIndex) });
}
