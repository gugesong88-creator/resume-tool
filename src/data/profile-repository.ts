import type { GlobalProfile, ResumeStore } from '../types/resume';
import { deepCopy } from '../utils/clone';

interface ProfileRepositoryRuntime extends Window {
  loadStore: () => ResumeStore;
  saveStore: (store: ResumeStore) => Promise<ResumeStore | null>;
  globalProfile?: GlobalProfile;
}

const runtime = window as unknown as ProfileRepositoryRuntime;

function defaultProfile(): GlobalProfile {
  return {
    basic_info: {
      id: 'basic_info',
      title: '个人信息',
      visible: true,
      data: { name: '', photo: '' },
      items: [
        { label: '电话', value: '' },
        { label: '邮箱', value: '' },
        { label: '微信', value: '' },
        { label: 'GitHub', value: '' }
      ]
    },
    education: {
      id: 'education',
      title: '教育经历',
      visible: true,
      items: []
    },
    custom: {
      id: 'custom',
      title: '其他',
      visible: true,
      items: []
    }
  };
}

export function getGlobalProfile(): GlobalProfile {
  return deepCopy(runtime.loadStore().globalProfile || defaultProfile());
}

export function saveGlobalProfileData(profile: GlobalProfile): void {
  const store = runtime.loadStore();
  const snapshot = deepCopy(profile);
  store.globalProfile = snapshot;
  runtime.globalProfile = snapshot;

  store.resumes.forEach(resume => {
    Object.entries(resume.modules || {}).forEach(([moduleId, module]) => {
      const profileModule = snapshot[moduleId];
      if (!module.is_global_linked || !profileModule) return;
      if (moduleId === 'basic_info') module.data = deepCopy(profileModule.data || {});
      module.items = deepCopy(profileModule.items || []);
    });
  });

  void runtime.saveStore(store);
}

Object.assign(window, { getGlobalProfile, saveGlobalProfileData });
