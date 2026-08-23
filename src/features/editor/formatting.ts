import type { ResumeDocument, ResumeFormatting, ResumeStore } from '../../types/resume';

interface ResumeTemplateFormatting {
  fontName?: string;
  fontHead?: string;
  fontBody?: string;
  lineHeight?: string | number;
  textAlign?: string;
  accent?: string;
  marginY?: number;
  marginX?: number;
  moduleSpacing?: number;
}

interface FormattingRuntime extends Window {
  editState: {
    resume: ResumeDocument;
    formatting?: ResumeFormatting;
  } | null;
  getTemplate: (templateId: string) => ResumeTemplateFormatting;
  loadStore: () => ResumeStore;
  saveStore: (store: ResumeStore) => Promise<unknown>;
  renderPreview: () => void;
  markDirty: () => void;
}

export type FormattingKey = keyof ResumeFormatting;
type NumericFormattingKey = Exclude<FormattingKey, 'fontFamily' | 'textAlign' | 'themeColor'>;

const runtime = window as unknown as FormattingRuntime;
const STRING_KEYS = new Set<FormattingKey>(['fontFamily', 'textAlign', 'themeColor']);
const FORMATTING_KEYS = new Set<FormattingKey>([
  'fontFamily',
  'nameSize',
  'headingSize',
  'bodySize',
  'lineHeight',
  'textAlign',
  'themeColor',
  'marginY',
  'marginX',
  'moduleSpacing'
]);
const FALLBACK_FORMATTING: ResumeFormatting = {
  fontFamily: 'default',
  nameSize: 24,
  headingSize: 14,
  bodySize: 11,
  lineHeight: 1.5,
  textAlign: 'left',
  themeColor: '#374151',
  marginY: 48,
  marginX: 52,
  moduleSpacing: 8
};

function numeric(value: string | number | undefined, fallback: number): number {
  const parsed = Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function textAlign(value: unknown): ResumeFormatting['textAlign'] {
  return value === 'justify' ? 'justify' : 'left';
}

export function getTemplateFormatting(templateId: string): ResumeFormatting {
  const template = runtime.getTemplate(templateId);
  return {
    fontFamily: 'default',
    nameSize: numeric(template.fontName, 24),
    headingSize: numeric(template.fontHead, 14),
    bodySize: numeric(template.fontBody, 11),
    lineHeight: numeric(template.lineHeight, 1.5),
    textAlign: textAlign(template.textAlign),
    themeColor: template.accent || '#374151',
    marginY: template.marginY ?? 48,
    marginX: template.marginX ?? 52,
    moduleSpacing: template.moduleSpacing ?? 8
  };
}

export function resolveResumeFormatting(resume: ResumeDocument): ResumeFormatting {
  const defaults = getTemplateFormatting(resume.template_id);
  const saved = resume.formatting || {};
  return {
    ...defaults,
    ...saved,
    nameSize: numeric(saved.nameSize, defaults.nameSize),
    headingSize: numeric(saved.headingSize, defaults.headingSize),
    bodySize: numeric(saved.bodySize, defaults.bodySize),
    lineHeight: numeric(saved.lineHeight, defaults.lineHeight),
    marginY: numeric(saved.marginY, defaults.marginY),
    marginX: numeric(saved.marginX, defaults.marginX),
    moduleSpacing: numeric(saved.moduleSpacing, defaults.moduleSpacing),
    textAlign: textAlign(saved.textAlign ?? defaults.textAlign),
    fontFamily: typeof saved.fontFamily === 'string' ? saved.fontFamily : defaults.fontFamily,
    themeColor: typeof saved.themeColor === 'string' ? saved.themeColor : defaults.themeColor
  };
}

export function isPastePlainEnabled(): boolean {
  const setting = runtime.loadStore().settings?.paste_plain;
  return setting === undefined ? true : Boolean(setting);
}

export function togglePastePlainSetting(checked: boolean): void {
  const store = runtime.loadStore();
  store.settings ||= {};
  store.settings.paste_plain = checked;
  void runtime.saveStore(store);
}

function setControlValue(id: string, value: string | number): void {
  const control = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
  if (control) control.value = String(value);
}

export function updateFormattingUI(): void {
  const pastePlain = document.getElementById('fmt-paste-plain') as HTMLInputElement | null;
  if (pastePlain) pastePlain.checked = isPastePlainEnabled();

  const formatting = runtime.editState?.formatting;
  if (!formatting) return;
  setControlValue('fmt-font-family', formatting.fontFamily || 'default');
  setControlValue('fmt-name-size', formatting.nameSize);
  setControlValue('fmt-heading-size', formatting.headingSize);
  setControlValue('fmt-body-size', formatting.bodySize);
  setControlValue('fmt-line-height', formatting.lineHeight);
  setControlValue('fmt-text-align', formatting.textAlign);
  setControlValue('fmt-margin-y', formatting.marginY);
  setControlValue('fmt-margin-x', formatting.marginX);
  setControlValue('fmt-module-spacing', formatting.moduleSpacing);
  setControlValue('fmt-theme-color', formatting.themeColor);
}

export function applyFormattingToElements(
  canvas: HTMLElement,
  input: Partial<ResumeFormatting>
): void {
  const formatting: ResumeFormatting = { ...FALLBACK_FORMATTING, ...input };
  canvas.style.fontFamily = formatting.fontFamily !== 'default' ? formatting.fontFamily : '';
  canvas.querySelectorAll<HTMLElement>('.resume-name').forEach(element => {
    element.style.fontSize = `${formatting.nameSize}px`;
  });
  canvas.querySelectorAll<HTMLElement>('.section-title').forEach(element => {
    element.style.fontSize = `${formatting.headingSize}px`;
  });
  canvas.querySelectorAll<HTMLElement>(
    '.resume-contact, .resume-contact-line1, .resume-contact-line2, .resume-contact-line3, '
    + '.contact-item, .static-label, .exp-desc, .exp-desc li, .exp-sub, '
    + '.skill-tag, .skill-tags, .skill-list, .exp-header, .exp-header .exp-left, '
    + '.exp-header .exp-right, .info-table td, .resume-intention, .exp-table, .exp-table td'
  ).forEach(element => {
    element.style.fontSize = `${formatting.bodySize}px`;
  });
  canvas.querySelectorAll<HTMLElement>(
    '.exp-desc, .exp-desc li, .resume-contact, .resume-contact-line1, '
    + '.resume-contact-line2, .resume-contact-line3, .skill-list'
  ).forEach(element => {
    element.style.lineHeight = String(formatting.lineHeight);
  });
  canvas.querySelectorAll<HTMLElement>('.exp-desc, .exp-desc li, .skill-list').forEach(element => {
    const justify = formatting.textAlign === 'justify';
    element.style.textAlign = justify ? 'justify' : 'left';
    element.style.textAlignLast = justify ? 'left' : '';
    element.style.textJustify = justify ? 'inter-ideograph' : '';
  });
}

export function applyFormatting(): void {
  const state = runtime.editState;
  const canvas = document.getElementById('a4-preview');
  if (!state?.formatting || !canvas) return;
  const formatting = state.formatting;

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
  applyFormattingToElements(canvas, formatting);
  canvas.style.setProperty('--accent', formatting.themeColor);
}

export function onTemplateSwitch(templateId: ResumeDocument['template_id']): void {
  const state = runtime.editState;
  if (!state) return;
  state.resume.template_id = templateId;
  state.formatting = getTemplateFormatting(templateId);
  updateFormattingUI();
  runtime.renderPreview();
  runtime.markDirty();
}

export function onFormatChange(key: FormattingKey, value: string): void {
  const state = runtime.editState;
  if (!state || !FORMATTING_KEYS.has(key)) return;
  state.formatting ||= resolveResumeFormatting(state.resume);

  if (STRING_KEYS.has(key)) {
    if (key === 'textAlign') state.formatting.textAlign = textAlign(value);
    else if (key === 'fontFamily') state.formatting.fontFamily = value;
    else if (key === 'themeColor') state.formatting.themeColor = value;
  } else {
    const numericKey = key as NumericFormattingKey;
    state.formatting[numericKey] = numeric(value, state.formatting[numericKey]);
  }
  applyFormatting();
  updateFormattingUI();
  runtime.markDirty();
}

Object.assign(window, {
  getTemplateFormatting,
  resolveResumeFormatting,
  isPastePlainEnabled,
  togglePastePlainSetting,
  updateFormattingUI,
  applyFormatting,
  applyFormattingToElements,
  onTemplateSwitch,
  onFormatChange
});
