import type { ResumeStore } from '../types/resume';

interface SaveStoreResponse {
  store: ResumeStore;
}

async function readJson<T>(response: Response): Promise<T | null> {
  if (!response.ok) return null;
  return response.json() as Promise<T>;
}

export const apiClient = {
  async fetchStore(): Promise<ResumeStore | null> {
    try {
      const response = await fetch(`/api/store?t=${Date.now()}`);
      return readJson<ResumeStore>(response);
    } catch (error) {
      console.warn('API Fetch Failed:', error);
      return null;
    }
  },

  async saveStore(data: ResumeStore): Promise<ResumeStore | null> {
    try {
      const response = await fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const payload = await readJson<SaveStoreResponse>(response);
      return payload?.store ?? null;
    } catch (error) {
      console.warn('API Save Failed:', error);
      return null;
    }
  }
};

window.apiClient = apiClient;
