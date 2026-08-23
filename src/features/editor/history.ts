import type { ResumeEditState } from '../../types/editor';
import type { ResumeDocument } from '../../types/resume';
import { showToast } from '../../ui/feedback';
import { renderEditorPanels } from './editor-renderer';
import { resolveResumeFormatting, updateFormattingUI } from './formatting';
import { renderPreview } from './preview';
import { markDirty, saveCurrentResume } from './save-controller';

interface HistoryRuntime extends Window {
  currentRoute?: string;
  editState: ResumeEditState | null;
}

const runtime = window as unknown as HistoryRuntime;
const HISTORY_LIMIT = 50;
let historyStack: string[] = [];
let historyIndex = -1;
let isHistoryNavigating = false;
let initialRecordTimer: number | null = null;

function updateHistoryUI(): void {
  const undoButton = document.getElementById('btn-undo') as HTMLButtonElement | null;
  const redoButton = document.getElementById('btn-redo') as HTMLButtonElement | null;
  if (undoButton) {
    undoButton.disabled = historyIndex <= 0;
    undoButton.style.opacity = undoButton.disabled ? '0.5' : '1';
    undoButton.style.cursor = undoButton.disabled ? 'not-allowed' : 'pointer';
  }
  if (redoButton) {
    redoButton.disabled = historyIndex >= historyStack.length - 1;
    redoButton.style.opacity = redoButton.disabled ? '0.5' : '1';
    redoButton.style.cursor = redoButton.disabled ? 'not-allowed' : 'pointer';
  }
}

function snapshotCurrentResume(): string | null {
  const state = runtime.editState;
  if (!state?.resume) return null;
  const snapshot: ResumeDocument = JSON.parse(JSON.stringify(state.resume)) as ResumeDocument;
  if (state.formatting) snapshot.formatting = JSON.parse(JSON.stringify(state.formatting));
  return JSON.stringify(snapshot);
}

export function recordHistory(): void {
  if (isHistoryNavigating) return;
  const snapshot = snapshotCurrentResume();
  if (!snapshot || historyStack[historyIndex] === snapshot) return;
  if (historyIndex < historyStack.length - 1) historyStack = historyStack.slice(0, historyIndex + 1);
  historyStack.push(snapshot);
  if (historyStack.length > HISTORY_LIMIT) historyStack.shift();
  historyIndex = historyStack.length - 1;
  updateHistoryUI();
}

function restoreHistoryState(snapshot: string): void {
  const state = runtime.editState;
  if (!state) return;
  try {
    const resume = JSON.parse(snapshot) as ResumeDocument;
    state.resume = resume;
    state.formatting = resolveResumeFormatting(resume);
    const nameInput = document.getElementById('editor-resume-name') as HTMLInputElement | null;
    if (nameInput) nameInput.value = resume.name || '';
    updateFormattingUI();
    renderEditorPanels();
    renderPreview();
    updateHistoryUI();
    markDirty();
    void saveCurrentResume();
    showToast('状态回滚完成');
  } catch (error) {
    console.error('状态回滚异常:', error);
    showToast('状态回滚失败');
  }
}

export function undo(): void {
  if (historyIndex <= 0) return;
  isHistoryNavigating = true;
  historyIndex -= 1;
  restoreHistoryState(historyStack[historyIndex]);
  isHistoryNavigating = false;
}

export function redo(): void {
  if (historyIndex >= historyStack.length - 1) return;
  isHistoryNavigating = true;
  historyIndex += 1;
  restoreHistoryState(historyStack[historyIndex]);
  isHistoryNavigating = false;
}

export function resetHistory(): void {
  if (initialRecordTimer !== null) window.clearTimeout(initialRecordTimer);
  historyStack = [];
  historyIndex = -1;
  isHistoryNavigating = false;
  updateHistoryUI();
  initialRecordTimer = window.setTimeout(() => {
    initialRecordTimer = null;
    recordHistory();
  }, 200);
}

Object.defineProperties(window, {
  historyStack: {
    configurable: true,
    get: () => historyStack,
    set: value => { historyStack = Array.isArray(value) ? value : []; }
  },
  historyIndex: {
    configurable: true,
    get: () => historyIndex,
    set: value => { historyIndex = Number.isInteger(value) ? value : -1; }
  },
  isHistoryNavigating: {
    configurable: true,
    get: () => isHistoryNavigating,
    set: value => { isHistoryNavigating = Boolean(value); }
  }
});

document.addEventListener('keydown', event => {
  if (runtime.currentRoute !== 'editor' || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z') return;
  event.preventDefault();
  if (event.shiftKey) redo();
  else undo();
});

Object.assign(window, { recordHistory, undo, redo, resetHistory });
