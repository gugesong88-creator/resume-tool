import { persistResume } from '../../data/resume-repository';
import type { ResumeDocument } from '../../types/resume';
import type { ResumeEditState, SaveStatus } from '../../types/editor';
import { deepCopy } from '../../utils/clone';
import { closeModal, showModal, showToast } from '../../ui/feedback';

interface SaveRuntime extends Window {
  editState: ResumeEditState | null;
  isHistoryNavigating?: boolean;
  recordHistory?: () => void;
  syncActiveEditableState?: () => boolean;
  escHtml: (value: string) => string;
  uuid: () => string;
  navigate: (route: 'editor', id: string) => void;
}

const runtime = window as unknown as SaveRuntime;
const SAVE_DELAY_MS = 3000;
const FALLBACK_INTERVAL_MS = 30000;

let scheduledSaveId: number | null = null;
let autoSaveIntervalId: number | null = null;
let historyDebounceId: number | null = null;
let latestSaveRequest = 0;
let copyOperationInProgress = false;

function clearScheduledSave(): void {
  if (scheduledSaveId !== null) window.clearTimeout(scheduledSaveId);
  scheduledSaveId = null;
}

function inputValue(id: string): string {
  return (document.getElementById(id) as HTMLInputElement | null)?.value.trim() ?? '';
}

function focusAndSelectInput(id: string): void {
  window.setTimeout(() => {
    const input = document.getElementById(id) as HTMLInputElement | null;
    input?.focus();
    input?.select();
  }, 50);
}

function createResumeCopy(source: ResumeDocument, name: string): ResumeDocument {
  const copy = deepCopy(source);
  const now = new Date().toISOString();
  copy.id = runtime.uuid();
  copy.name = name;
  copy.created_at = now;
  copy.updated_at = now;
  return copy;
}

export function updateSaveStatus(status: SaveStatus): void {
  const element = document.getElementById('save-status');
  if (!element) return;
  element.className = `save-status ${status}`;
  const labels: Record<SaveStatus, string> = {
    saved: '✓ 已保存',
    unsaved: '● 有未保存修改',
    saving: '⏳ 正在保存...'
  };
  element.textContent = labels[status];
}

export function scheduleAutoSave(): void {
  if (!runtime.editState) return;
  clearScheduledSave();
  scheduledSaveId = window.setTimeout(() => {
    scheduledSaveId = null;
    void saveCurrentResume();
  }, SAVE_DELAY_MS);
}

export function markDirty(): void {
  const state = runtime.editState;
  if (!state) return;
  state.changeRevision = (state.changeRevision ?? 0) + 1;

  if (!runtime.isHistoryNavigating && runtime.recordHistory) {
    if (historyDebounceId !== null) window.clearTimeout(historyDebounceId);
    historyDebounceId = window.setTimeout(runtime.recordHistory, 500);
  }

  state.dirty = true;
  updateSaveStatus('unsaved');
  scheduleAutoSave();
}

export function syncCurrentEditingState(): ResumeDocument | null {
  // Persist the current contenteditable DOM without forcing blur. Blurring here
  // rebuilds the preview and steals the caret every time auto-save runs.
  runtime.syncActiveEditableState?.();

  const state = runtime.editState;
  if (!state?.resume) return null;
  const nameInput = document.getElementById('editor-resume-name') as HTMLInputElement | null;
  if (nameInput) {
    state.resume.name = nameInput.value.trim() || state.resume.name || '未命名简历';
  }
  if (state.formatting) state.resume.formatting = deepCopy(state.formatting);

  const templateSelect = document.getElementById('editor-template-select') as HTMLSelectElement | null;
  if (templateSelect?.value === 'T01_classic_dense') {
    state.resume.template_id = templateSelect.value;
  }
  return state.resume;
}

export async function saveCurrentResume(): Promise<ResumeDocument | null> {
  const state = runtime.editState;
  if (!state?.resume) return null;
  clearScheduledSave();
  const resume = syncCurrentEditingState();
  if (!resume) return null;

  const revision = state.changeRevision ?? 0;
  const requestId = ++latestSaveRequest;
  updateSaveStatus('saving');

  try {
    const persisted = await persistResume(resume);
    const current = runtime.editState;
    if (current !== state || current.resume.id !== resume.id || requestId !== latestSaveRequest) {
      return persisted;
    }

    if ((current.changeRevision ?? 0) === revision) {
      current.resume = deepCopy(persisted);
      current.dirty = false;
      updateSaveStatus('saved');
    } else {
      current.dirty = true;
      updateSaveStatus('unsaved');
      scheduleAutoSave();
    }
    return current.resume;
  } catch (error) {
    console.error('保存简历失败:', error);
    if (runtime.editState === state) {
      state.dirty = true;
      updateSaveStatus('unsaved');
    }
    showToast('保存失败，请确认本地服务仍在运行');
    return null;
  }
}

async function persistCopy(name: string, saveSourceFirst: boolean): Promise<void> {
  if (copyOperationInProgress) return;
  const state = runtime.editState;
  if (!state?.resume) return;
  copyOperationInProgress = true;

  try {
    if (saveSourceFirst) {
      const saved = await saveCurrentResume();
      if (!saved) return;
    } else if (!syncCurrentEditingState()) {
      return;
    }

    const source = runtime.editState?.resume;
    if (!source) return;
    const copy = createResumeCopy(source, name);
    const persisted = await persistResume(copy);
    showToast(saveSourceFirst ? '已创建副本' : '已保存为新版本');
    closeModal();
    runtime.navigate('editor', persisted.id);
  } catch (error) {
    console.error('创建简历副本失败:', error);
    showToast('创建副本失败，请确认本地服务仍在运行');
  } finally {
    copyOperationInProgress = false;
  }
}

function openCopyModal(options: {
  title: string;
  description: string;
  inputId: string;
  actionLabel: string;
  saveSourceFirst: boolean;
}): void {
  const state = runtime.editState;
  if (!state?.resume) {
    showToast('当前没有正在编辑的简历');
    return;
  }
  syncCurrentEditingState();
  const defaultName = `${state.resume.name || '未命名简历'} 副本`;
  showModal(
    options.title,
    `<p>${options.description}</p><input id="${options.inputId}" value="${runtime.escHtml(defaultName)}" autofocus>`,
    [
      { label: '取消' },
      {
        label: options.actionLabel,
        cls: 'btn-primary',
        callback: () => {
          const name = inputValue(options.inputId);
          if (!name) {
            showToast('请输入名称');
            return false;
          }
          void persistCopy(name, options.saveSourceFirst);
          return false;
        }
      }
    ]
  );
  focusAndSelectInput(options.inputId);
}

export function saveAsNew(): void {
  openCopyModal({
    title: '另存为',
    description: '保存为一个新的简历版本：',
    inputId: 'saveas-name',
    actionLabel: '保存',
    saveSourceFirst: false
  });
}

export function duplicateCurrentResume(): void {
  openCopyModal({
    title: '复制当前简历',
    description: '基于当前简历创建副本：',
    inputId: 'duplicate-current-name',
    actionLabel: '复制',
    saveSourceFirst: true
  });
}

export function onResumeNameChange(name: string): void {
  const state = runtime.editState;
  if (!state) return;
  state.resume.name = name;
  markDirty();
}

export function stopAutoSave(): void {
  clearScheduledSave();
  if (autoSaveIntervalId !== null) window.clearInterval(autoSaveIntervalId);
  autoSaveIntervalId = null;
  if (historyDebounceId !== null) window.clearTimeout(historyDebounceId);
  historyDebounceId = null;
}

export function startAutoSave(): void {
  stopAutoSave();
  autoSaveIntervalId = window.setInterval(() => {
    if (runtime.editState?.dirty) void saveCurrentResume();
  }, FALLBACK_INTERVAL_MS);
}

window.addEventListener('beforeunload', event => {
  if (!runtime.editState?.dirty) return;
  event.preventDefault();
  event.returnValue = '';
});

document.addEventListener('keydown', event => {
  if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return;
  event.preventDefault();
  if (!runtime.editState?.dirty) return;
  void saveCurrentResume().then(saved => {
    if (saved) showToast('已保存');
  });
});

Object.assign(window, {
  markDirty,
  updateSaveStatus,
  scheduleAutoSave,
  syncCurrentEditingState,
  saveCurrentResume,
  saveAsNew,
  duplicateCurrentResume,
  onResumeNameChange,
  startAutoSave,
  stopAutoSave
});
