import { persistResume } from '../../data/resume-repository';
import type { ResumeDocument, ResumeModuleItem } from '../../types/resume';
import type { ResumeEditState } from '../../types/editor';
import { deepCopy } from '../../utils/clone';
import { closeModal, showModal, showToast } from '../../ui/feedback';
import { saveCurrentResume, syncCurrentEditingState } from './save-controller';

interface EnglishDraftRuntime extends Window {
  editState: ResumeEditState | null;
  richTextToPlain: (value: string) => string;
  escHtml: (value: string) => string;
  uuid: () => string;
  navigate: (route: 'editor', id: string) => void;
}

const runtime = window as unknown as EnglishDraftRuntime;
const MODULE_TITLES: Record<string, string> = {
  basic_info: 'Personal Information',
  education: 'Education',
  internship: 'Internship Experience',
  project: 'Project Experience',
  campus: 'Campus Experience',
  skills: 'Skills & Certifications',
  custom: 'Additional Information'
};
const BASIC_DICTIONARIES: Record<string, Record<string, string>> = {
  gender: { 女: 'Female', 男: 'Male' },
  political_status: {
    预备党员: 'Probationary CPC Member',
    中共党员: 'CPC Member',
    共青团员: 'CYL Member',
    群众: 'Non-affiliated'
  },
  intention: {
    产品经理实习生: 'Product Manager Intern',
    产品经理: 'Product Manager',
    项目管理实习生: 'Project Management Intern',
    商务分析实习生: 'Business Analyst Intern'
  },
  availability: { 随时到岗: 'Available immediately' }
};
const ITEM_FIELDS = ['title', 'school', 'major', 'role', 'subtitle', 'company', 'project_name', 'time'];
let draftOperationInProgress = false;

function plainText(value: unknown): string {
  return runtime.richTextToPlain(String(value || '')).replace(/<[^>]*>/g, '').trim();
}

function cleanTitle(value: unknown): string {
  return plainText(value).replace(/[｜|]/g, ' | ');
}

function translateBasicField(key: string, value: unknown): string {
  const text = plainText(value);
  if (!text) return '';
  return BASIC_DICTIONARIES[key]?.[text]
    || text.replace(/年/g, '.').replace(/月/g, '').replace(/至今/g, 'Present');
}

function translateItemField(value: unknown): string {
  return cleanTitle(value)
    .replace(/硕士/g, 'Master')
    .replace(/本科/g, 'Bachelor')
    .replace(/研究生/g, 'Graduate Student')
    .replace(/产品经理实习生/g, 'Product Manager Intern')
    .replace(/项目管理实习生/g, 'Project Management Intern')
    .replace(/商务分析实习生/g, 'Business Analyst Intern')
    .replace(/图书情报/g, 'Library and Information Science')
    .replace(/信息管理与信息系统/g, 'Information Management and Information Systems')
    .replace(/至今/g, 'Present')
    .replace(/年/g, '.')
    .replace(/月/g, '');
}

function translateBullet(value: unknown): string {
  return plainText(value)
    .replace(/^获奖荣誉[：:]/, 'Honors: ')
    .replace(/^研究方向[：:]/, 'Research Focus: ')
    .replace(/^核心课程[：:]/, 'Core Courses: ')
    .replace(/^技能[：:]/, 'Skills: ')
    .replace(/^语言[：:]/, 'Languages: ')
    .replace(/；/g, '; ')
    .replace(/，/g, ', ')
    .replace(/。/g, '. ')
    .replace(/：/g, ': ')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .trim();
}

function translateItem(item: ResumeModuleItem): void {
  ITEM_FIELDS.forEach(key => {
    const value = item[key];
    if (typeof value === 'string' && value) item[key] = translateItemField(value);
  });
  if (Array.isArray(item.bullets)) item.bullets = item.bullets.map(translateBullet);
  if (Array.isArray(item.details)) item.details = item.details.map(translateBullet);
}

export function buildEnglishResumeDraft(
  source: ResumeDocument,
  idFactory: () => string = runtime.uuid
): ResumeDocument {
  const draft = deepCopy(source);
  const now = new Date().toISOString();
  draft.id = idFactory();
  draft.name = `${source.name || '未命名简历'} English`;
  draft.created_at = now;
  draft.updated_at = now;
  draft.meta ||= {};
  draft.meta.note = 'English draft generated from Chinese resume structure. Review and polish before delivery.';
  draft.language = 'en';

  Object.entries(draft.modules).forEach(([moduleId, module]) => {
    module.title = MODULE_TITLES[moduleId] || cleanTitle(module.title);
    if (moduleId === 'basic_info' && module.data) {
      Object.keys(module.data).forEach(key => {
        if (key !== 'photo') module.data![key] = translateBasicField(key, module.data![key]);
      });
    }
    if (moduleId === 'skills' && module.data && typeof module.data.tags === 'string') {
      module.data.tags = translateBullet(module.data.tags);
    }
    module.items?.forEach(translateItem);
  });
  return draft;
}

async function generateEnglishDraft(name: string): Promise<void> {
  if (draftOperationInProgress) return;
  draftOperationInProgress = true;
  try {
    const savedSource = await saveCurrentResume();
    if (!savedSource) return;
    const draft = buildEnglishResumeDraft(savedSource);
    draft.name = name;
    const persisted = await persistResume(draft);
    showToast('英文版草稿已生成');
    closeModal();
    runtime.navigate('editor', persisted.id);
  } catch (error) {
    console.error('生成英文版草稿失败:', error);
    showToast('生成英文版失败，请确认本地服务仍在运行');
  } finally {
    draftOperationInProgress = false;
  }
}

export function createEnglishResumeDraft(): void {
  const source = syncCurrentEditingState();
  if (!source) {
    showToast('请先打开一份简历');
    return;
  }
  const sourceName = source.name || '当前简历';
  showModal('生成英文版简历', `
    <p>将基于「${runtime.escHtml(sourceName)}」复制一份英文草稿。</p>
    <p style="color:var(--text-muted);font-size:12px;line-height:1.6;">结构、排序、照片和排版会保留；模块标题、常见岗位和部分字段会转成英文。正文经历会做保守转换，请生成后人工润色。</p>
    <input id="english-resume-name" value="${runtime.escHtml(`${sourceName} English`)}" autofocus>
  `, [
    { label: '取消' },
    {
      label: '生成英文草稿',
      cls: 'btn-primary',
      callback: () => {
        const input = document.getElementById('english-resume-name') as HTMLInputElement | null;
        const name = input?.value.trim();
        if (!name) {
          showToast('请输入名称');
          return false;
        }
        void generateEnglishDraft(name);
        return false;
      }
    }
  ]);
  window.setTimeout(() => {
    const input = document.getElementById('english-resume-name') as HTMLInputElement | null;
    input?.focus();
    input?.select();
  }, 50);
}

Object.assign(window, { createEnglishResumeDraft, buildEnglishResumeDraft });
