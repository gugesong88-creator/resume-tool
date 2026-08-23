import { getResume } from '../../data/resume-repository';
import { getGlobalProfile } from '../../data/profile-repository';
import type { ResumeEditState } from '../../types/editor';
import { deepCopy } from '../../utils/clone';
import { renderEditorPanels } from './editor-renderer';
import { resolveResumeFormatting, updateFormattingUI } from './formatting';
import { renderPreview } from './preview';
import { startAutoSave, updateSaveStatus } from './save-controller';
import { resetHistory } from './history';

interface EditorSessionRuntime extends Window {
  editState: ResumeEditState | null;
  navigate: (route: 'home') => void;
}

const runtime = window as unknown as EditorSessionRuntime;

export function loadEditor(id?: string): void {
  const resume = id ? getResume(id) : null;
  if (!resume) {
    runtime.navigate('home');
    return;
  }

  const globalProfile = getGlobalProfile();
  Object.entries(resume.modules).forEach(([moduleId, module]) => {
    const profileModule = globalProfile[moduleId];
    if (!module.is_global_linked || !profileModule) return;
    if (moduleId === 'basic_info') module.data = deepCopy(profileModule.data || {});
    module.items = deepCopy(profileModule.items || []);
  });

  runtime.editState = {
    resume: deepCopy(resume),
    formatting: resolveResumeFormatting(resume),
    dirty: false,
    changeRevision: 0,
    saveTimer: null
  };

  const nameInput = document.getElementById('editor-resume-name') as HTMLInputElement | null;
  const templateSelect = document.getElementById('editor-template-select') as HTMLSelectElement | null;
  if (nameInput) nameInput.value = resume.name;
  if (templateSelect) templateSelect.value = resume.template_id;
  updateSaveStatus('saved');
  updateFormattingUI();
  renderEditorPanels();
  renderPreview();
  startAutoSave();

  resetHistory();
}

Object.assign(window, { loadEditor });
