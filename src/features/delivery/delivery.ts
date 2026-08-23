import type { DeliveryRecord, DeliveryStatus, ResumeDocument } from '../../types/resume';
import { getAllResumes, getResume } from '../../data/resume-repository';
import {
  loadDeliveryRecords,
  saveDeliveryRecords
} from '../../data/delivery-repository';
import { renderHomePage } from '../home/home';

const DELIVERY_STATUSES: DeliveryStatus[] = ['已投递', '面试邀请', '已拒绝', '已录用', '待定'];

interface ModalAction {
  label: string;
  cls?: string;
  callback?: () => boolean | void;
}

interface DeliveryRuntime extends Window {
  currentRoute: string;
  escHtml: (value: string) => string;
  formatDate: (value: string) => string;
  uuid: () => string;
  showModal: (title: string, content: string, actions: ModalAction[]) => void;
  showToast: (message: string) => void;
}

const runtime = window as unknown as DeliveryRuntime;

function inputValue(id: string): string {
  const element = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
  return element?.value.trim() ?? '';
}

function isDeliveryStatus(value: string): value is DeliveryStatus {
  return DELIVERY_STATUSES.includes(value as DeliveryStatus);
}

function statusOptions(selected: DeliveryStatus = '已投递'): string {
  return DELIVERY_STATUSES
    .map(status => `<option value="${status}" ${status === selected ? 'selected' : ''}>${status}</option>`)
    .join('');
}

function deliveryForm(resumes: ResumeDocument[], fixedResume?: ResumeDocument): string {
  const resumeField = fixedResume
    ? `<input type="text" value="${runtime.escHtml(fixedResume.name)}" readonly style="background-color:#f3f4f6;">`
    : `<select id="delivery-resume-select">${resumes.map(resume =>
        `<option value="${runtime.escHtml(resume.id)}">${runtime.escHtml(resume.name)}</option>`
      ).join('')}</select>`;

  return `<div class="delivery-modal-fields">
    <div class="field-group full-width">
      <label>${fixedResume ? '当前简历' : '选择简历'}</label>
      ${resumeField}
    </div>
    <div class="field-group">
      <label>公司名称</label>
      <input type="text" id="delivery-company" placeholder="例如：京东">
    </div>
    <div class="field-group">
      <label>职位名称</label>
      <input type="text" id="delivery-position" placeholder="例如：产品经理">
    </div>
    <div class="field-group">
      <label>投递邮箱</label>
      <input type="email" id="delivery-email" placeholder="例如：hr@example.com">
    </div>
    <div class="field-group">
      <label>投递日期</label>
      <input type="date" id="delivery-date" value="${new Date().toISOString().slice(0, 10)}">
    </div>
    <div class="field-group">
      <label>当前状态</label>
      <select id="delivery-status">${statusOptions()}</select>
    </div>
    <div class="field-group full-width">
      <label>备注</label>
      <textarea id="delivery-notes" placeholder="例如：在线笔试、面试安排等"></textarea>
    </div>
  </div>`;
}

function readDeliveryRecord(fixedResume?: ResumeDocument): DeliveryRecord | null {
  const resumeId = fixedResume?.id || inputValue('delivery-resume-select');
  const resume = fixedResume || getResume(resumeId);
  const company = inputValue('delivery-company');
  const position = inputValue('delivery-position');
  const email = inputValue('delivery-email');
  const statusValue = inputValue('delivery-status');

  if (!resume) {
    runtime.showToast('选择的简历不存在');
    return null;
  }
  if (!company || !position || !email) {
    runtime.showToast('请填写公司、职位和投递邮箱');
    return null;
  }

  return {
    id: runtime.uuid(),
    resumeId: resume.id,
    resumeName: resume.name,
    company,
    position,
    email,
    date: inputValue('delivery-date'),
    status: isDeliveryStatus(statusValue) ? statusValue : '已投递',
    notes: inputValue('delivery-notes'),
    createdAt: new Date().toISOString()
  };
}

function persistNewRecord(record: DeliveryRecord): void {
  const records = loadDeliveryRecords();
  records.push(record);
  saveDeliveryRecords(records);
  refreshDeliverySurfaces();
  runtime.showToast('投递记录已添加');
}

export function refreshDeliverySurfaces(): void {
  renderDeliveryView();
  if (runtime.currentRoute === 'home') renderHomePage();
}

export function addDeliveryRecordForResume(resumeId: string): void {
  const resume = getResume(resumeId);
  if (!resume) {
    runtime.showToast('简历不存在');
    return;
  }
  runtime.showModal(`为「${resume.name}」添加投递记录`, deliveryForm([resume], resume), [
    { label: '取消' },
    {
      label: '添加',
      cls: 'btn-primary',
      callback: () => {
        const record = readDeliveryRecord(resume);
        if (!record) return false;
        persistNewRecord(record);
      }
    }
  ]);
}

export function addDeliveryRecord(): void {
  const resumes = getAllResumes();
  if (!resumes.length) {
    runtime.showToast('请先创建简历，再添加投递记录');
    return;
  }
  runtime.showModal('添加投递记录', deliveryForm(resumes), [
    { label: '取消' },
    {
      label: '添加',
      cls: 'btn-primary',
      callback: () => {
        const record = readDeliveryRecord();
        if (!record) return false;
        persistNewRecord(record);
      }
    }
  ]);
}

export function updateDeliveryStatus(id: string, newStatus: DeliveryStatus): void {
  const records = loadDeliveryRecords();
  const record = records.find(candidate => candidate.id === id);
  if (!record) {
    runtime.showToast('找不到该投递记录');
    return;
  }
  record.status = newStatus;
  record.updatedAt = new Date().toISOString();
  saveDeliveryRecords(records);
  refreshDeliverySurfaces();
  runtime.showToast('状态已更新');
}

export function deleteDeliveryRecord(id: string): void {
  runtime.showModal('确认删除', '<p>确定要删除这条投递记录吗？此操作不可恢复。</p>', [
    { label: '取消', cls: 'btn-outline' },
    {
      label: '确认删除',
      cls: 'btn-danger',
      callback: () => {
        saveDeliveryRecords(loadDeliveryRecords().filter(record => record.id !== id));
        refreshDeliverySurfaces();
        runtime.showToast('投递记录已删除');
      }
    }
  ]);
}

export function filterDeliveryRecords(): void {
  const status = inputValue('status-filter');
  const company = inputValue('company-filter').toLocaleLowerCase('zh-CN');
  const position = inputValue('position-filter').toLocaleLowerCase('zh-CN');
  renderDeliveryTable(loadDeliveryRecords().filter(record => {
    const matchesStatus = !status || record.status === status;
    const matchesCompany = !company || (record.company || '').toLocaleLowerCase('zh-CN').includes(company);
    const matchesPosition = !position || (record.position || '').toLocaleLowerCase('zh-CN').includes(position);
    return matchesStatus && matchesCompany && matchesPosition;
  }));
}

export function renderDeliveryTable(records: DeliveryRecord[]): void {
  const tableBody = document.getElementById('delivery-table-body');
  if (!tableBody) return;
  tableBody.innerHTML = records.map(record => {
    const status = record.status || '已投递';
    const id = runtime.escHtml(record.id || '');
    return `<tr>
      <td>${runtime.escHtml(record.company || '')}</td>
      <td>${runtime.escHtml(record.position || '')}</td>
      <td>${runtime.escHtml(record.resumeName || '')}</td>
      <td>${runtime.formatDate(record.date || '')}</td>
      <td>${runtime.escHtml(record.email || '')}</td>
      <td><span class="status-badge status-${status.replace(/\s/g, '')}">${status}</span></td>
      <td>${record.notes ? runtime.escHtml(record.notes) : '-'}</td>
      <td>
        <div class="delivery-actions">
          <select data-delivery-status data-delivery-id="${id}" style="font-size:11px;padding:4px 6px;">
            ${statusOptions(status)}
          </select>
          <button class="btn-xs btn-danger" data-delivery-action="delete" data-delivery-id="${id}">删除</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

export function renderDeliveryView(): void {
  renderDeliveryTable(loadDeliveryRecords());
}

document.addEventListener('change', event => {
  const select = (event.target as Element | null)?.closest<HTMLSelectElement>('[data-delivery-status]');
  const id = select?.dataset.deliveryId;
  if (select && id && isDeliveryStatus(select.value)) updateDeliveryStatus(id, select.value);
});

document.addEventListener('click', event => {
  const button = (event.target as Element | null)?.closest<HTMLElement>('[data-delivery-action="delete"]');
  const id = button?.dataset.deliveryId;
  if (id) deleteDeliveryRecord(id);
});

Object.assign(window, {
  refreshDeliverySurfaces,
  addDeliveryRecordForResume,
  addDeliveryRecord,
  updateDeliveryStatus,
  deleteDeliveryRecord,
  filterDeliveryRecords,
  renderDeliveryTable,
  renderDeliveryView
});
