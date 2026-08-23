import type { ResumeDocument, ResumeModule } from '../../types/resume';
import { isPastePlainEnabled } from './formatting';
import { openPhotoPicker } from './photo';
import { renderEditorPanels } from './editor-renderer';
import { showToast } from '../../ui/feedback';

interface RichTextRuntime extends Window {
  editState: { resume: ResumeDocument } | null;
  renderPreview: () => void;
  markDirty: () => void;
  sanitizeRichHtml: (value: string) => string;
  richTextToPlain: (value: string) => string;
}

const runtime = window as unknown as RichTextRuntime;
const EMPTY_PLACEHOLDERS = new Set([
  '点击填写',
  '年龄',
  '男/女',
  '中共党员/团员/群众',
  '随时到岗',
  '2026.06',
  '时间'
]);

let savedRichTextRange: Range | null = null;

function finishResumeEdit(): void {
  renderEditorPanels();
  runtime.renderPreview();
  runtime.markDirty();
}

function editableValue(element: HTMLElement): { html: string; text: string } {
  const html = runtime.sanitizeRichHtml(element.innerHTML.trim());
  return { html, text: runtime.richTextToPlain(html).trim() };
}

function readListItems(element: HTMLElement): string[] {
  const items = Array.from(element.querySelectorAll('li'))
    .map(item => runtime.sanitizeRichHtml(item.innerHTML.trim()))
    .filter(Boolean);
  if (items.length) return items;

  const fallback = runtime.sanitizeRichHtml(element.innerHTML.trim());
  return runtime.richTextToPlain(fallback).trim() ? [fallback] : [];
}

function writeBasicInfo(
  module: ResumeModule,
  parts: string[],
  html: string,
  text: string
): void {
  module.data ||= {};
  const value = EMPTY_PLACEHOLDERS.has(text) ? '' : html || text;
  if (parts[1] === 'name') {
    module.data.name = value;
  } else if (parts[1] === 'items') {
    const item = module.items?.[Number(parts[2])];
    if (item && parts[3]) item[parts[3]] = value;
  }
}

function writeSkillTag(module: ResumeModule, parts: string[], value: string): void {
  module.data ||= {};
  const tags = String(module.data.tags || '')
    .split(/[;；]+/)
    .map(tag => tag.trim())
    .filter(Boolean);
  const index = Number(parts[2]);
  if (index >= 0 && index < tags.length) {
    tags[index] = value;
    module.data.tags = tags.join('；');
  }
}

function writeItemValue(
  moduleId: string,
  module: ResumeModule,
  parts: string[],
  element: HTMLElement,
  html: string,
  text: string
): boolean {
  const itemIndex = Number(parts[1]);
  const item = module.items?.[itemIndex];
  if (!Number.isInteger(itemIndex) || !item) return false;
  const key = parts[2];

  if (key === '_bullets') {
    const listItems = readListItems(element);
    if (moduleId === 'custom') {
      module.items = listItems.map(value => ({ bullets: [value] }));
    } else {
      item.bullets = listItems.length ? listItems : [''];
    }
    return true;
  }

  if (key === 'bullet') {
    const bulletIndex = Number(parts[3]);
    const bullets = item.bullets || item.details || [];
    if (bulletIndex >= 0 && bulletIndex < bullets.length) {
      item.bullets ||= item.details || [];
      item.bullets[bulletIndex] = html || text;
    }
    return true;
  }

  if (key) item[key] = html || text;
  return true;
}

export function isNodeInsidePreview(node: Node | null): boolean {
  if (!node) return false;
  const element = node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement;
  return Boolean(element?.closest('.a4-canvas'));
}

export function getCurrentEditableElement(): HTMLElement | null {
  const selection = window.getSelection();
  const node = selection?.anchorNode;
  if (!node) return null;
  const element = node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement;
  return element?.closest<HTMLElement>('[data-editable]') || null;
}

export function saveRichTextSelection(): void {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  if (!range.collapsed && isNodeInsidePreview(range.commonAncestorContainer)) {
    savedRichTextRange = range.cloneRange();
  }
}

export function restoreRichTextSelection(): boolean {
  const selection = window.getSelection();
  if (!selection) return false;
  if (!savedRichTextRange) return selection.rangeCount > 0;
  try {
    selection.removeAllRanges();
    selection.addRange(savedRichTextRange);
    return true;
  } catch {
    savedRichTextRange = null;
    return false;
  }
}

function applySelectionColor(color: string, successMessage: string): void {
  const restored = restoreRichTextSelection();
  const selection = window.getSelection();
  if (!restored || !selection?.rangeCount || selection.isCollapsed) {
    showToast('请先在右侧简历预览中选中文字');
    return;
  }

  const range = selection.getRangeAt(0);
  if (!isNodeInsidePreview(range.commonAncestorContainer)) {
    showToast('请先选中右侧简历预览中的文字');
    return;
  }

  const editable = getCurrentEditableElement();
  try {
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('foreColor', false, color);
    if (editable?.dataset.editable) editable.blur();
    else runtime.markDirty();
    showToast(successMessage);
  } catch (error) {
    console.error(error);
    showToast('设置文字颜色失败');
  }
}

export function applySelectedTextColor(color: string): void {
  if (color) applySelectionColor(color, '已设置所选文字颜色');
}

export function clearSelectedTextColor(): void {
  applySelectionColor('#111827', '已恢复所选文字为黑色');
}

function insertPlainText(event: ClipboardEvent): void {
  event.preventDefault();
  const text = event.clipboardData?.getData('text') || '';
  if (document.queryCommandSupported('insertText')) {
    document.execCommand('insertText', false, text);
    return;
  }
  const selection = window.getSelection();
  if (!selection?.rangeCount) return;
  selection.deleteFromDocument();
  selection.getRangeAt(0).insertNode(document.createTextNode(text));
}

export function onEditableFocus(event: FocusEvent): void {
  const element = event.target as HTMLElement | null;
  if (!element) return;
  element.style.outline = '2px solid var(--accent)';
  element.style.outlineOffset = '2px';
  element.style.borderRadius = '2px';
}

export function configureEditableElement(
  element: HTMLElement,
  onBlur: (event: FocusEvent) => void
): void {
  element.contentEditable = 'true';
  element.addEventListener('focus', onEditableFocus);
  element.addEventListener('blur', event => onBlur(event as FocusEvent));
  element.addEventListener('mouseup', saveRichTextSelection);
  element.addEventListener('keyup', saveRichTextSelection);
  element.addEventListener('paste', event => {
    if (isPastePlainEnabled()) insertPlainText(event);
  });
  element.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !['ul', 'li'].includes(element.tagName.toLowerCase())) {
      event.preventDefault();
      element.blur();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
      event.preventDefault();
      document.execCommand('bold', false);
    }
  });
}

export function onEditableBlur(event: FocusEvent): void {
  const element = event.target as HTMLElement | null;
  const state = runtime.editState;
  const path = element?.dataset.editable;
  if (!element || !state || !path) return;
  element.style.outline = '';
  element.style.outlineOffset = '';

  const parts = path.split('.');
  const moduleId = parts[0];
  const module = state.resume.modules[moduleId];
  if (!module) return;
  let { html, text } = editableValue(element);

  if (path.endsWith('._title')) {
    const clone = element.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.section-icon, .section-actions').forEach(node => node.remove());
    ({ html, text } = editableValue(clone));
    module.title = html || text || module.title;
    finishResumeEdit();
    return;
  }
  if (moduleId === 'basic_info') {
    writeBasicInfo(module, parts, html, text);
    finishResumeEdit();
    return;
  }
  if (moduleId === 'skills' && parts[1] === 'tag') {
    writeSkillTag(module, parts, html || text);
    finishResumeEdit();
    return;
  }
  if (writeItemValue(moduleId, module, parts, element, html, text)) finishResumeEdit();
}

export function attachEditableHandlers(canvas: HTMLElement): void {
  canvas.querySelectorAll<HTMLElement>('[data-editable]').forEach(element => {
    const path = element.dataset.editable;
    if (!path) return;
    const moduleId = path.split('.', 1)[0];
    const linked = Boolean(runtime.editState?.resume.modules[moduleId]?.is_global_linked);
    if (linked) {
      element.contentEditable = 'false';
      element.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        showToast('该模块已链接至全局个人档案，无法在简历中编辑。请在“全局个人档案”页签统一修改。');
      });
      return;
    }
    if (element.contentEditable === 'false') return;
    if (path === 'basic_info._photo') {
      element.addEventListener('click', event => {
        event.preventDefault();
        openPhotoPicker();
      });
      return;
    }
    configureEditableElement(element, onEditableBlur);
  });
}

document.addEventListener('selectionchange', saveRichTextSelection);

Object.assign(window, {
  isNodeInsidePreview,
  getCurrentEditableElement,
  saveRichTextSelection,
  restoreRichTextSelection,
  applySelectedTextColor,
  clearSelectedTextColor,
  attachEditableHandlers,
  onEditableFocus,
  onEditableBlur
});
