import type { ResumeDocument, ResumeFormatting, ResumeModule } from '../../types/resume';
import { applyFormatting } from './formatting';
import { attachEditableHandlers } from './rich-text-editor';

interface ResumeTemplate {
  cssClass: string;
  accent?: string;
}

interface PreviewRuntime extends Window {
  editState: {
    resume: ResumeDocument;
    formatting?: ResumeFormatting;
  } | null;
  getTemplate: (templateId: string) => ResumeTemplate;
  renderResumeHTML: (
    template: ResumeTemplate,
    modules: Record<string, ResumeModule>,
    meta: Record<string, unknown>
  ) => string;
  decodeEscapedRichTextInPreview: (canvas: HTMLElement) => void;
}

const runtime = window as unknown as PreviewRuntime;

export function renderPreview(): void {
  const state = runtime.editState;
  const canvas = document.getElementById('a4-preview');
  if (!state || !canvas) return;

  const template = runtime.getTemplate(state.resume.template_id);
  canvas.className = `a4-canvas ${template.cssClass}`;
  canvas.innerHTML = runtime.renderResumeHTML(
    template,
    state.resume.modules,
    state.resume.meta || {}
  );
  runtime.decodeEscapedRichTextInPreview(canvas);
  canvas.style.setProperty('--accent', state.formatting?.themeColor || template.accent || '#374151');
  applyFormatting();
  attachEditableHandlers(canvas);
}

Object.assign(window, { renderPreview });
