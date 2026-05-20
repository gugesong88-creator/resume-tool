// API Client (Classic Script)
window.apiClient = {
  async fetchStore() {
    try {
      const resp = await fetch('/api/store?t=' + Date.now());
      if (!resp.ok) return null;
      return await resp.json();
    } catch (e) {
      console.warn('API Fetch Failed:', e);
      return null;
    }
  },

  async saveStore(data) {
    try {
      const resp = await fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!resp.ok) return null;
      const payload = await resp.json();
      return payload.store;
    } catch (e) {
      console.warn('API Save Failed:', e);
      return null;
    }
  }
};
