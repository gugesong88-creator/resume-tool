import type { ResumeEditState } from '../../types/editor';
import {
  applyFormatting,
  applyFormattingToElements,
  updateFormattingUI
} from './formatting';
import { markDirty } from './save-controller';
import { showToast } from '../../ui/feedback';

export type EditorViewMode = 'split' | 'preview' | 'edit';

interface LayoutRuntime extends Window {
  editState: ResumeEditState | null;
}

const runtime = window as unknown as LayoutRuntime;
const VIEW_MODES: EditorViewMode[] = ['split', 'preview', 'edit'];
const A4_HEIGHT_LIMIT = 1125;
let currentEditorViewMode: EditorViewMode = 'split';
let overflowFrame: number | null = null;

export function setEditorViewMode(input: EditorViewMode): void {
  const mode = VIEW_MODES.includes(input) ? input : 'split';
  currentEditorViewMode = mode;
  const view = document.getElementById('view-editor');
  if (!view) return;
  view.classList.remove('split-mode', 'preview-only', 'edit-only');
  view.classList.add(mode === 'preview' ? 'preview-only' : mode === 'edit' ? 'edit-only' : 'split-mode');
  VIEW_MODES.forEach(candidate => {
    document.getElementById(`view-mode-${candidate}`)?.classList.toggle('active', candidate === mode);
  });
}

export function toggleLeftPanel(): void {
  const panel = document.getElementById('editor-left-panel');
  const toggle = document.getElementById('editor-left-toggle');
  if (!panel || !toggle) return;
  const collapsed = panel.classList.toggle('collapsed');
  toggle.textContent = collapsed ? '▶' : '◀';
  toggle.title = collapsed ? '展开编辑面板' : '收起编辑面板';
}

export function getActualContentHeight(): number {
  const canvas = document.getElementById('a4-preview');
  if (!canvas) return 0;
  const shadow = document.createElement('div');
  shadow.className = canvas.className;
  shadow.innerHTML = canvas.innerHTML;
  shadow.style.cssText = 'width:794px;min-height:1123px;position:absolute;left:-9999px;top:0;box-sizing:border-box;visibility:hidden;';
  document.body.appendChild(shadow);

  try {
    const formatting = runtime.editState?.formatting;
    if (formatting) {
      applyFormattingToElements(shadow, formatting);
      shadow.style.padding = `${formatting.marginY}px ${formatting.marginX}px`;
      shadow.querySelectorAll<HTMLElement>('.section').forEach(section => {
        section.style.marginTop = `${formatting.moduleSpacing}px`;
      });
    }
    shadow.querySelectorAll<HTMLElement>(
      '.inline-add-btn, .entry-delete-btn, .section-actions, .resume-photo-placeholder'
    ).forEach(element => { element.style.display = 'none'; });
    return shadow.scrollHeight;
  } finally {
    shadow.remove();
  }
}

export function checkPageOverflow(): boolean {
  const overflowing = getActualContentHeight() > A4_HEIGHT_LIMIT;
  const warning = document.getElementById('page-overflow-warning');
  if (warning) warning.style.display = overflowing ? 'inline-block' : 'none';
  return overflowing;
}

function scheduleOverflowCheck(): void {
  if (overflowFrame !== null) window.cancelAnimationFrame(overflowFrame);
  overflowFrame = window.requestAnimationFrame(() => {
    overflowFrame = null;
    checkPageOverflow();
  });
}

export function autoCompressLayout(): void {
  const formatting = runtime.editState?.formatting;
  if (!formatting) return;
  const limits = { lineHeight: 1.25, moduleSpacing: 2, marginY: 24, bodySize: 10.5 };
  let iterations = 0;
  let changed = false;

  while (getActualContentHeight() > A4_HEIGHT_LIMIT && iterations < 20) {
    iterations += 1;
    if (formatting.marginY > limits.marginY) {
      formatting.marginY = Math.max(limits.marginY, formatting.marginY - 4);
    } else if (formatting.moduleSpacing > limits.moduleSpacing) {
      formatting.moduleSpacing = Math.max(limits.moduleSpacing, formatting.moduleSpacing - 2);
    } else if (formatting.lineHeight > limits.lineHeight) {
      formatting.lineHeight = Math.max(limits.lineHeight, formatting.lineHeight - 0.05);
    } else if (formatting.bodySize > limits.bodySize) {
      formatting.bodySize = Math.max(limits.bodySize, formatting.bodySize - 0.5);
    } else {
      break;
    }
    changed = true;
  }

  updateFormattingUI();
  applyFormatting();
  const stillOverflowing = checkPageOverflow();
  if (stillOverflowing) showToast('已压缩至参数底限，须人工删减文本数据');
  else if (changed) showToast('排版参数已自适应至一页规格');
  else showToast('当前内容已经适合一页，无需压缩');
  if (changed) markDirty();
}

const preview = document.getElementById('a4-preview');
if (preview) {
  new MutationObserver(scheduleOverflowCheck).observe(preview, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true
  });
}

setEditorViewMode(currentEditorViewMode);

Object.defineProperty(window, 'currentEditorViewMode', {
  configurable: true,
  get: () => currentEditorViewMode,
  set: value => setEditorViewMode(value as EditorViewMode)
});

Object.assign(window, {
  setEditorViewMode,
  toggleLeftPanel,
  getActualContentHeight,
  checkPageOverflow,
  autoCompressLayout
});
