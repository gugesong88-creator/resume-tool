import type { ResumeStore } from '../../types/resume';
import { showModal } from '../../ui/feedback';

interface StorageStatusRuntime extends Window {
  loadStore: () => ResumeStore;
}

export interface StorageSummary {
  resumeCount: number;
  bytes: number;
  kilobytes: string;
}

const runtime = window as unknown as StorageStatusRuntime;

export function getStorageSummary(store: ResumeStore = runtime.loadStore()): StorageSummary {
  const bytes = new Blob([JSON.stringify(store)]).size;
  return {
    resumeCount: store.resumes?.length || 0,
    bytes,
    kilobytes: (bytes / 1024).toFixed(2)
  };
}

export function checkStorageStatus(): void {
  try {
    const summary = getStorageSummary();
    showModal('本地存储状态', `
      <p>简历数量：<strong>${summary.resumeCount} 份</strong></p>
      <p style="margin-top:8px;">JSON 数据体积：<strong>${summary.kilobytes} KB</strong></p>
      <p style="margin-top:12px;color:var(--text-muted);font-size:12px;line-height:1.6;">建议定期备份项目中的 data/resumes.json 与 data/images 目录。</p>
    `, [{ label: '关闭', cls: 'btn-primary' }]);
  } catch (error) {
    console.error('读取存储状态失败:', error);
    showModal('本地存储状态', '<p>存储状态读取失败，请确认本地数据文件可访问。</p>', [
      { label: '关闭', cls: 'btn-primary' }
    ]);
  }
}

function mountStorageStatusButton(): void {
  const navigation = document.querySelector('.nav-left');
  if (!navigation || document.getElementById('storage-status-btn')) return;
  const button = document.createElement('button');
  button.id = 'storage-status-btn';
  button.type = 'button';
  button.className = 'btn-outline btn-sm';
  button.style.marginLeft = '8px';
  button.style.borderColor = 'var(--border)';
  button.textContent = '💽 存储探针';
  button.addEventListener('click', checkStorageStatus);
  navigation.appendChild(button);
}

mountStorageStatusButton();
Object.assign(window, { checkStorageStatus, getStorageSummary });
