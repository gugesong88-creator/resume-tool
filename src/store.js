// 统一状态管理
class Store {
  constructor() {
    this.STORAGE_KEY = 'resume_app_data';
    this._data = { resumes: [], deliveryRecords: [], settings: {} };
    this._editState = null;
    this._listeners = [];
    this._saveQueue = Promise.resolve();
    this._saveRevision = 0;
  }

  normalizeStore(data) {
    if (window.ResumeSchema && typeof window.ResumeSchema.normalizeStore === 'function') {
      return window.ResumeSchema.normalizeStore(data);
    }

    data = data && typeof data === 'object' ? data : {};
    const resumes = Array.isArray(data.resumes) ? data.resumes : [];
    return {
      resumes: resumes,
      deliveryRecords: Array.isArray(data.deliveryRecords) ? data.deliveryRecords : [],
      settings: data.settings && typeof data.settings === 'object' ? data.settings : {},
      globalProfile: data.globalProfile && typeof data.globalProfile === 'object' ? data.globalProfile : undefined
    };
  }

  clone(obj) {
    return obj ? JSON.parse(JSON.stringify(obj)) : null;
  }

  mergeServerOnlyResumes(localData, serverData) {
    const local = this.normalizeStore(localData);
    const server = this.normalizeStore(serverData);
    const localIds = new Set(local.resumes.map(r => r && r.id).filter(Boolean));
    const localNames = new Set(local.resumes.map(r => r && r.name).filter(Boolean));
    const serverOnly = server.resumes.filter(r => {
      if (!r) return false;
      if (r.id && localIds.has(r.id)) return false;
      if (!r.id && r.name && localNames.has(r.name)) return false;
      return true;
    });
    if (serverOnly.length) {
      local.resumes = local.resumes.concat(serverOnly);
    }
    return local;
  }

  // ==== 数据加载 ====
  async load() {
    let loaded = false;
    if (window.apiClient) {
      const serverData = await window.apiClient.fetchStore();
      if (serverData && serverData.resumes) {
        this._data = this.normalizeStore(serverData);
        loaded = true;
      }
    }
    
    if (!loaded) {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        if (raw) {
          this._data = this.normalizeStore(JSON.parse(raw));
        }
      } catch (e) {
        console.warn('Failed to load from localStorage', e);
      }
    }
    return this.clone(this._data);
  }

  // ==== 同步数据访问 (兼容老代码) ====
  getStore() {
    return this.clone(this._data);
  }

  // ==== 数据保存 (乐观更新) ====
  saveStore(storeObj, options = {}) {
    this._data = this.normalizeStore(storeObj);
    const revision = ++this._saveRevision;
    
    // 1. 同步保存到 localStorage
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._data));
    } catch(e) {}

    // 2. 异步同步到服务器 (不阻塞 UI)
    if (window.apiClient) {
      const localData = this.clone(this._data);
      const task = this._saveQueue
        .catch(() => null)
        .then(async () => {
          if (options.allowResumeDeletes) return localData;
          const serverData = await window.apiClient.fetchStore();
          return serverData && serverData.resumes
            ? this.mergeServerOnlyResumes(localData, serverData)
            : localData;
        })
        .then(dataToSave => window.apiClient.saveStore(dataToSave))
        .then(serverData => {
          if (serverData && serverData.resumes) {
            // Older queued responses must never replace a newer in-memory edit.
            if (revision === this._saveRevision) {
              this._data = this.normalizeStore(serverData);
              try {
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._data));
              } catch(e) {}

              // 如果正在编辑，更新内存引用以防止覆盖冲突
              if (this._editState && this._editState.resume && !this._editState.dirty) {
                const persisted = this._data.resumes.find(r => r.id === this._editState.resume.id);
                if (persisted) this._editState.resume = this.clone(persisted);
              }
            }
          }
          return serverData;
        });

      this._saveQueue = task.catch(error => {
        console.warn('Failed to sync store to disk', error);
        return null;
      });

      return task;
    }

    return Promise.resolve(this.clone(this._data));
  }

  // ==== 编辑器状态 ====
  get editState() {
    return this._editState;
  }

  set editState(val) {
    this._editState = val;
  }
}

// 实例化全局 Store
window.appStore = new Store();

// ==== 为遗留代码提供的全局接口拦截 ====
// 将旧代码对 window.loadStore 的调用重定向到 appStore
window.loadStore = function() {
  return window.appStore.getStore();
};

window.saveStore = function(data, options) {
  return window.appStore.saveStore(data, options);
};

// 代理遗留的全局变量，使其读写 appStore
Object.defineProperty(window, 'editState', {
  get: () => window.appStore.editState,
  set: (val) => { window.appStore.editState = val; }
});
