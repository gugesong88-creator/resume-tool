import type { DeliveryRecord, ResumeDocument } from '../../types/resume';
import {
  createNewResume,
  deleteResume,
  duplicateResume,
  getAllResumes,
  getResume,
  saveResume
} from '../../data/resume-repository';
import { loadDeliveryRecords } from '../../data/delivery-repository';

interface ModalAction {
  label: string;
  cls?: string;
  callback?: () => boolean | void;
}

interface HomeRuntime extends Window {
  escHtml: (value: string) => string;
  formatTime: (value: string) => string;
  getTemplate: (id: string) => { name: string };
  showModal: (title: string, content: string, actions: ModalAction[]) => void;
  showToast: (message: string) => void;
  navigate: (route: 'editor', id: string) => void;
  quickExport: (id: string) => void;
  exportSingleEntity: (id: string) => void;
  addDeliveryRecordForResume: (id: string) => void;
}

const runtime = window as unknown as HomeRuntime;

function inputValue(id: string): string {
  return (document.getElementById(id) as HTMLInputElement | null)?.value.trim() ?? '';
}

function noteOf(resume: ResumeDocument): string {
  const note = resume.meta?.note;
  return typeof note === 'string' ? note : '';
}

export function getMostRecentStatus(records: DeliveryRecord[]): string {
  if (!records.length) return '未投递';
  return [...records]
    .sort((left, right) => {
      const rightTime = Date.parse(right.updatedAt || right.createdAt || right.date || '') || 0;
      const leftTime = Date.parse(left.updatedAt || left.createdAt || left.date || '') || 0;
      return rightTime - leftTime;
    })[0].status || '未投递';
}

export function renderHomePage(): void {
  const container = document.getElementById('resume-list');
  if (!container) return;

  const resumes = getAllResumes();
  if (!resumes.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h2>还没有简历</h2>
        <p>创建你的第一份在线简历，使用经典高密度模板自由编辑并导出 PDF</p>
        <button class="btn-primary" data-resume-action="create">+ 创建新简历</button>
      </div>`;
    return;
  }

  const deliveryRecords = loadDeliveryRecords();
  container.innerHTML = `<div class="resume-grid">${resumes.map(resume => {
    const template = runtime.getTemplate(resume.template_id);
    const deliveries = deliveryRecords.filter(record => record.resumeId === resume.id);
    const deliverySummary = deliveries.length
      ? ` | 投递: ${deliveries.length}次 | 状态: ${getMostRecentStatus(deliveries)}`
      : ' | 尚未投递';
    const note = noteOf(resume);
    const safeId = runtime.escHtml(resume.id);

    return `
      <div class="resume-card">
        <div class="resume-card-name">${runtime.escHtml(resume.name)}</div>
        <div class="resume-card-meta">模板：${runtime.escHtml(template.name)}</div>
        <div class="resume-card-meta">最近修改：${runtime.formatTime(resume.updated_at || '')}${deliverySummary}</div>
        ${note ? `<div class="resume-card-note">📌 ${runtime.escHtml(note)}</div>` : ''}
        <div class="resume-card-actions">
          <button class="btn-primary btn-sm" data-resume-action="edit" data-resume-id="${safeId}">继续编辑</button>
          <button class="btn-outline btn-sm" data-resume-action="copy" data-resume-id="${safeId}">复制一份</button>
          <button class="btn-outline btn-sm" data-resume-action="rename" data-resume-id="${safeId}">重命名</button>
          <button class="btn-outline btn-sm" data-resume-action="quick-export" data-resume-id="${safeId}">导出PDF</button>
          <button class="btn-outline btn-sm" data-resume-action="entity-export" data-resume-id="${safeId}">单份导出</button>
          <button class="btn-outline btn-sm" data-resume-action="add-delivery" data-resume-id="${safeId}">添加投递记录</button>
          <button class="btn-danger btn-sm" data-resume-action="delete" data-resume-id="${safeId}">删除</button>
        </div>
      </div>`;
  }).join('')}</div>`;
}

export function createResume(): void {
  runtime.showModal(
    '创建新简历',
    '<p>请输入简历名称：</p><input id="new-resume-name" placeholder="例如：王小明_产品经理通用版">',
    [
      { label: '取消' },
      {
        label: '创建',
        cls: 'btn-primary',
        callback: () => {
          const name = inputValue('new-resume-name');
          if (!name) {
            runtime.showToast('请输入简历名称');
            return false;
          }
          const resume = createNewResume(name);
          runtime.showToast('创建成功');
          runtime.navigate('editor', resume.id);
        }
      }
    ]
  );
  setTimeout(() => document.getElementById('new-resume-name')?.focus(), 100);
}

export function copyResume(id: string): void {
  const resume = getResume(id);
  if (!resume) {
    runtime.showToast('未找到要复制的简历');
    return;
  }
  runtime.showModal(
    '复制简历',
    `<p>基于「${runtime.escHtml(resume.name)}」创建副本</p><input id="copy-name" value="${runtime.escHtml(`${resume.name || '未命名简历'} 副本`)}" autofocus>`,
    [
      { label: '取消' },
      {
        label: '复制',
        cls: 'btn-primary',
        callback: () => {
          const name = inputValue('copy-name');
          if (!name) {
            runtime.showToast('请输入名称');
            return false;
          }
          const copy = duplicateResume(id, name);
          runtime.showToast(copy ? '复制成功' : '复制失败');
          if (copy) renderHomePage();
          return copy ? undefined : false;
        }
      }
    ]
  );
  setTimeout(() => {
    const input = document.getElementById('copy-name') as HTMLInputElement | null;
    input?.focus();
    input?.select();
  }, 50);
}

export function renameResume(id: string): void {
  const resume = getResume(id);
  if (!resume) return;
  runtime.showModal('重命名简历', `<input id="rename-input" value="${runtime.escHtml(resume.name)}">`, [
    { label: '取消' },
    {
      label: '确定',
      cls: 'btn-primary',
      callback: () => {
        const name = inputValue('rename-input');
        if (!name) {
          runtime.showToast('请输入名称');
          return false;
        }
        resume.name = name;
        saveResume(resume);
        renderHomePage();
        runtime.showToast('已重命名');
      }
    }
  ]);
}

export function deleteResumeConfirm(id: string): void {
  const resume = getResume(id);
  if (!resume) return;
  runtime.showModal('确认删除', `<p>确定要删除「<strong>${runtime.escHtml(resume.name)}</strong>」吗？此操作不可恢复。</p>`, [
    { label: '取消', cls: 'btn-outline' },
    {
      label: '确认删除',
      cls: 'btn-danger',
      callback: () => {
        deleteResume(id);
        renderHomePage();
        runtime.showToast('已删除');
      }
    }
  ]);
}

document.addEventListener('click', event => {
  const button = (event.target as Element | null)?.closest<HTMLElement>('[data-resume-action]');
  if (!button) return;
  const action = button.dataset.resumeAction;
  const id = button.dataset.resumeId || '';

  if (action === 'create') createResume();
  else if (action === 'edit' && id) runtime.navigate('editor', id);
  else if (action === 'copy' && id) copyResume(id);
  else if (action === 'rename' && id) renameResume(id);
  else if (action === 'quick-export' && id) runtime.quickExport(id);
  else if (action === 'entity-export' && id) runtime.exportSingleEntity(id);
  else if (action === 'add-delivery' && id) runtime.addDeliveryRecordForResume(id);
  else if (action === 'delete' && id) deleteResumeConfirm(id);
});

Object.assign(window, {
  renderHomePage,
  getMostRecentStatus,
  createResume,
  copyResume,
  renameResume,
  deleteResumeConfirm
});
