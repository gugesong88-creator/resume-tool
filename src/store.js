// 统一状态管理
class Store {
  constructor() {
    this.STORAGE_KEY = 'resume_app_data';
    this._data = { resumes: [], deliveryRecords: [], settings: {} };
    this._editState = null;
    this._listeners = [];
  }

  normalizeStore(data) {
    data = data && typeof data === 'object' ? data : {};
    const resumes = Array.isArray(data.resumes) ? data.resumes : [];
    resumes.forEach(resume => {
      if (resume && resume.modules) {
        delete resume.modules.campus;
        delete resume.modules.skills;
      }
    });
    return {
      resumes: resumes,
      deliveryRecords: Array.isArray(data.deliveryRecords) ? data.deliveryRecords : [],
      settings: data.settings && typeof data.settings === 'object' ? data.settings : {}
    };
  }

  clone(obj) {
    return obj ? JSON.parse(JSON.stringify(obj)) : null;
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
  saveStore(storeObj) {
    this._data = this.normalizeStore(storeObj);
    
    // 1. 同步保存到 localStorage
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._data));
    } catch(e) {}

    // 2. 异步同步到服务器 (不阻塞 UI)
    if (window.apiClient) {
      window.apiClient.saveStore(this._data).then(serverData => {
        if (serverData && serverData.resumes) {
          this._data = this.normalizeStore(serverData);
          
          // 如果正在编辑，更新内存引用以防止覆盖冲突
          if (this._editState && this._editState.resume) {
             const persisted = this._data.resumes.find(r => r.id === this._editState.resume.id);
             if (persisted) {
                 this._editState.resume = this.clone(persisted);
             }
          }
        }
      });
    }
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

window.saveStore = function(data) {
  window.appStore.saveStore(data);
};

// 代理遗留的全局变量，使其读写 appStore
Object.defineProperty(window, 'editState', {
  get: () => window.appStore.editState,
  set: (val) => { window.appStore.editState = val; }
});
