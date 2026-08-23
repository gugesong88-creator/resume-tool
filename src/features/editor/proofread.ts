import type { ResumeEditState } from '../../types/editor';
import type { ResumeModule } from '../../types/resume';
import { renderEditorPanels } from './editor-renderer';
import { renderPreview } from './preview';
import { markDirty, syncCurrentEditingState } from './save-controller';
import { showModal, showToast } from '../../ui/feedback';

export interface ProofreadIssue {
  type: string;
  message: string;
  sample: string;
  path: string;
  label: string;
}

interface ProofreadRuntime extends Window {
  editState: ResumeEditState | null;
  richTextToPlain: (value: string) => string;
  escHtml: (value: string) => string;
}

type StringVisitor = (
  value: string,
  path: string,
  owner: Record<string, unknown>,
  key: string
) => void;

const runtime = window as unknown as ProofreadRuntime;
const MODULE_LABELS: Record<string, string> = {
  basic_info: '个人信息',
  education: '教育经历',
  internship: '实习经历',
  project: '项目经历',
  campus: '校园经历',
  skills: '技能证书',
  custom: '其他'
};
const FIELD_LABELS: Record<string, string> = {
  title: '标题', school: '学校', major: '专业', role: '角色', time: '时间',
  company: '公司', project_name: '项目名'
};

function plainText(value: unknown): string {
  return runtime.richTextToPlain(String(value || '')).replace(/<[^>]*>/g, '').trim();
}

function pathLabel(path: string): string {
  return path
    .replace('modules.basic_info.data.', '个人信息 / ')
    .replace(/modules\.([^.]+)\.title/, (_match, moduleId: string) => `${MODULE_LABELS[moduleId] || moduleId} / 模块标题`)
    .replace(/modules\.([^.]+)\.data\.tags/, (_match, moduleId: string) => `${MODULE_LABELS[moduleId] || moduleId} / 技能标签`)
    .replace(/modules\.([^.]+)\.items\.(\d+)\.bullets\.(\d+)/, (_match, moduleId: string, index: string, bulletIndex: string) =>
      `${MODULE_LABELS[moduleId] || moduleId} / 第 ${Number(index) + 1} 条 / 要点 ${Number(bulletIndex) + 1}`)
    .replace(/modules\.([^.]+)\.items\.(\d+)\.([^.]+)/, (_match, moduleId: string, index: string, field: string) =>
      `${MODULE_LABELS[moduleId] || moduleId} / 第 ${Number(index) + 1} 条 / ${FIELD_LABELS[field] || field}`);
}

function walkStrings(input: unknown, path: string, visitor: StringVisitor): void {
  if (!input || typeof input !== 'object') return;
  const owner = input as Record<string, unknown>;
  Object.keys(owner).forEach(key => {
    const value = owner[key];
    const nextPath = path ? `${path}.${key}` : key;
    if (typeof value === 'string') visitor(value, nextPath, owner, key);
    else walkStrings(value, nextPath, visitor);
  });
}

export function analyzeText(value: string, path: string): ProofreadIssue[] {
  const text = plainText(value);
  if (!text) return [];
  const issues: ProofreadIssue[] = [];
  const add = (type: string, message: string, sample?: string): void => {
    issues.push({ type, message, sample: sample || text, path, label: pathLabel(path) });
  };

  if (/ {2,}/.test(text)) add('多余空格', '存在连续多个半角空格。', text.match(/.{0,10} {2,}.{0,10}/)?.[0]);
  if (/[\u4e00-\u9fa5] +[\u4e00-\u9fa5]/.test(text)) add('中文空格', '中文字符之间存在多余空格。', text.match(/.{0,10}[\u4e00-\u9fa5] +[\u4e00-\u9fa5].{0,10}/)?.[0]);
  if (/[\u4e00-\u9fa5][,;:?!]/.test(text)) add('中文后半角标点', '中文后面出现半角标点，建议改为中文标点。', text.match(/.{0,10}[\u4e00-\u9fa5][,;:?!].{0,10}/)?.[0]);
  if (/[A-Za-z][，。；：！？][A-Za-z]/.test(text)) add('英文中全角标点', '英文单词之间出现中文标点，建议改为英文标点或空格。', text.match(/.{0,10}[A-Za-z][，。；：！？][A-Za-z].{0,10}/)?.[0]);
  if (/[。！？.!?]{2,}/.test(text)) add('重复标点', '存在连续重复句尾标点。', text.match(/.{0,10}[。！？.!?]{2,}.{0,10}/)?.[0]);
  if (/[\u4e00-\u9fa5]\.[\u4e00-\u9fa5]/.test(text)) add('中文句号异常', '中文句子中间出现英文句号，建议确认是否应为中文句号。', text.match(/.{0,10}[\u4e00-\u9fa5]\.[\u4e00-\u9fa5].{0,10}/)?.[0]);

  const looksSentence = text.length >= 18 && /[\u4e00-\u9fa5]/.test(text) && !/[。！？；;.!?]$/.test(text);
  const skipEnding = /[）)]$/.test(text) || /^[0-9.年月\-—至今\s]+$/.test(text) || /@|https?:|www\./i.test(text);
  if (looksSentence && !skipEnding) add('句尾标点', '较长中文句子缺少句尾标点。');
  return issues;
}

export function collectProofreadIssues(modules: Record<string, ResumeModule>): ProofreadIssue[] {
  const issues: ProofreadIssue[] = [];
  walkStrings(modules, 'modules', (value, path) => {
    if (!path.endsWith('.photo')) issues.push(...analyzeText(value, path));
  });
  return issues;
}

export function fixPlainTextValue(value: string): string {
  if (!value || /<[^>]+>/.test(value)) return value;
  return value
    .replace(/ {2,}/g, ' ')
    .replace(/([\u4e00-\u9fa5]) +([\u4e00-\u9fa5])/g, '$1$2')
    .replace(/([。！？.!?])\1+/g, '$1')
    .replace(/([\u4e00-\u9fa5]),/g, '$1，')
    .replace(/([\u4e00-\u9fa5]);/g, '$1；')
    .replace(/([\u4e00-\u9fa5]):/g, '$1：')
    .replace(/([\u4e00-\u9fa5])!/g, '$1！')
    .replace(/([\u4e00-\u9fa5])\?/g, '$1？');
}

export function applyProofreadFixes(modules: Record<string, ResumeModule>): number {
  let changed = 0;
  walkStrings(modules, 'modules', (value, path, owner, key) => {
    if (path.endsWith('.photo')) return;
    const next = fixPlainTextValue(value);
    if (next !== value) {
      owner[key] = next;
      changed += 1;
    }
  });
  return changed;
}

function buildProofreadHtml(issues: ProofreadIssue[]): string {
  if (!issues.length) return '<div class="proof-empty">未发现明显的标点、空格或句尾问题。</div>';
  const counts = issues.reduce<Record<string, number>>((result, issue) => {
    result[issue.type] = (result[issue.type] || 0) + 1;
    return result;
  }, {});
  const chips = Object.entries(counts)
    .map(([type, count]) => `<span class="proof-chip">${runtime.escHtml(type)}：${count}</span>`)
    .join('');
  const rows = issues.slice(0, 80).map(issue => `
    <div class="proof-item">
      <div class="proof-item-title"><span>${runtime.escHtml(issue.label)}</span><span>${runtime.escHtml(issue.type)}</span></div>
      <div class="proof-item-body">${runtime.escHtml(issue.message)}</div>
      <div class="proof-item-body">片段：${runtime.escHtml(issue.sample)}</div>
    </div>`).join('');
  const omitted = issues.length > 80
    ? `<div class="proof-item"><div class="proof-item-body">还有 ${issues.length - 80} 条未展开，请先处理当前高频问题。</div></div>`
    : '';
  return `<div class="proof-report"><div class="proof-summary">${chips}</div><div class="proof-list">${rows}${omitted}</div></div>`;
}

export function runProofreadCheck(): void {
  const resume = syncCurrentEditingState();
  if (!resume) {
    showToast('请先打开一份简历');
    return;
  }
  const issues = collectProofreadIssues(resume.modules);
  showModal(`错别字 / 标点检查（${issues.length}）`, buildProofreadHtml(issues), [
    { label: '关闭' },
    {
      label: '保守修复',
      cls: 'btn-primary',
      callback: () => {
        const changed = applyProofreadFixes(resume.modules);
        if (changed) {
          renderEditorPanels();
          renderPreview();
          markDirty();
        }
        showToast(`已保守修复 ${changed} 处`);
      }
    }
  ]);
}

Object.assign(window, { runProofreadCheck });
