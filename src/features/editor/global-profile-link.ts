import type { ResumeDocument, ResumeModuleItem } from '../../types/resume';
import { deepCopy } from '../../utils/clone';
import { showModal, showToast } from '../../ui/feedback';

interface LinkableModule {
  is_global_linked?: boolean;
  data?: Record<string, unknown>;
  items?: ResumeModuleItem[];
}

interface LinkRuntime extends Window {
  editState: { resume: ResumeDocument } | null;
  globalProfile?: Record<string, LinkableModule>;
  renderEditorPanels: () => void;
  renderPreview: () => void;
  markDirty: () => void;
}

const runtime = window as unknown as LinkRuntime;

function finishLinkChange(message: string): void {
  runtime.renderEditorPanels();
  runtime.renderPreview();
  runtime.markDirty();
  showToast(message);
}

function linkModule(moduleId: string, module: LinkableModule): void {
  module.is_global_linked = true;
  const globalModule = runtime.globalProfile?.[moduleId];
  if (globalModule) {
    if (moduleId === 'basic_info') module.data = deepCopy(globalModule.data || {});
    module.items = deepCopy(globalModule.items || []);
  }
  finishLinkChange('已链接并同步全局个人档案');
}

export function toggleGlobalProfileLink(moduleId: string, checked: boolean): void {
  const module = runtime.editState?.resume.modules[moduleId] as LinkableModule | undefined;
  if (!module) return;

  if (!checked) {
    module.is_global_linked = false;
    finishLinkChange('已取消链接，保留本地副本');
    return;
  }

  showModal(
    '确认链接全局档案',
    '<p>链接后将使用全局个人档案数据覆写当前简历中该模块的内容，您的本地修改将会被丢弃且不可恢复。</p><p>确定要链接吗？</p>',
    [
      { label: '取消' },
      {
        label: '确认链接',
        cls: 'btn-primary',
        callback: () => linkModule(moduleId, module)
      }
    ]
  );
}
