import type { ResumeDocument, ResumeModule } from '../../types/resume';
import { showModal, showToast } from '../../ui/feedback';

interface ModuleRuntime extends Window {
  editState: { resume: ResumeDocument } | null;
  renderEditorPanels: () => void;
  renderPreview: () => void;
  markDirty: () => void;
}

const runtime = window as unknown as ModuleRuntime;

function getModule(moduleId: string): ResumeModule | null {
  return runtime.editState?.resume.modules[moduleId] || null;
}

function finishModuleChange(message?: string): void {
  runtime.renderEditorPanels();
  runtime.renderPreview();
  runtime.markDirty();
  if (message) showToast(message);
}

export function moveModule(moduleId: string, direction: -1 | 1): void {
  const modules = runtime.editState?.resume.modules;
  if (!modules) return;
  const ordered = Object.values(modules).sort((left, right) => left.order - right.order);
  const currentIndex = ordered.findIndex(module => module.id === moduleId);
  const targetIndex = currentIndex + direction;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= ordered.length) return;

  const current = ordered[currentIndex];
  const target = ordered[targetIndex];
  [current.order, target.order] = [target.order, current.order];
  finishModuleChange();
}

export function toggleModulePanel(moduleId: string): void {
  const panel = document.querySelector<HTMLElement>(
    `#editor-left-panel .module-panel[data-module="${CSS.escape(moduleId)}"]`
  );
  const body = panel?.querySelector<HTMLElement>('.module-panel-body');
  const icon = panel?.querySelector<HTMLElement>('.collapse-icon');
  if (!panel || !body) return;

  const collapsed = body.style.display === 'none';
  body.style.display = collapsed ? '' : 'none';
  panel.classList.toggle('collapsed', !collapsed);
  panel.classList.toggle('open', collapsed);
  if (icon) icon.style.transform = collapsed ? '' : 'rotate(-90deg)';
}

export function toggleModuleVisibility(moduleId: string): void {
  const module = getModule(moduleId);
  if (!module) return;
  module.visible = !module.visible;
  finishModuleChange(module.visible ? '模块已显示' : '模块已隐藏');
}

export function confirmModuleDeletion(moduleId: string): void {
  const module = getModule(moduleId);
  if (!module) return;

  showModal(
    `确认删除「${module.title}」`,
    '<p>删除后该模块下的所有内容将从当前简历中移除。</p><p style="color:var(--text-muted)">你也可以选择“仅隐藏”，隐藏后仍可恢复。</p>',
    [
      { label: '取消' },
      {
        label: '仅隐藏',
        cls: 'btn-outline',
        callback: () => {
          module.visible = false;
          finishModuleChange('模块已隐藏');
        }
      },
      {
        label: '确认删除',
        cls: 'btn-danger',
        callback: () => {
          module.visible = false;
          module.items = [];
          if (module.data) module.data = {};
          finishModuleChange('模块已删除');
        }
      }
    ]
  );
}
