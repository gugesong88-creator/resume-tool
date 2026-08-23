import type { ResumeDocument, ResumeStore } from '../types/resume';

interface RepositoryRuntime extends Window {
  loadStore: () => ResumeStore;
  saveStore: (store: ResumeStore, options?: { allowResumeDeletes?: boolean }) => Promise<ResumeStore | null>;
  createNewResumeData: (name: string, idFactory: () => string) => ResumeDocument;
  uuid: () => string;
}

const runtime = window as unknown as RepositoryRuntime;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function timestamp(value?: string): number {
  const parsed = value ? Date.parse(value) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getAllResumes(): ResumeDocument[] {
  return [...runtime.loadStore().resumes]
    .sort((left, right) => timestamp(right.updated_at) - timestamp(left.updated_at));
}

export function getResume(id: string): ResumeDocument | null {
  return runtime.loadStore().resumes.find(resume => resume.id === id) ?? null;
}

export const getResumeById = getResume;

function prepareResumeSave(resume: ResumeDocument): ResumeStore {
  const store = runtime.loadStore();
  const index = store.resumes.findIndex(candidate => candidate.id === resume.id);
  resume.updated_at = new Date().toISOString();
  if (index >= 0) store.resumes[index] = resume;
  else store.resumes.push(resume);
  return store;
}

export function saveResume(resume: ResumeDocument): ResumeDocument {
  const store = prepareResumeSave(resume);
  void runtime.saveStore(store);
  return resume;
}

export async function persistResume(resume: ResumeDocument): Promise<ResumeDocument> {
  const store = prepareResumeSave(resume);
  const persistedStore = await runtime.saveStore(store);
  if (!persistedStore) throw new Error('简历未能写入本地存储服务');
  return persistedStore.resumes.find(candidate => candidate.id === resume.id) ?? resume;
}

export function deleteResume(id: string): void {
  const store = runtime.loadStore();
  store.resumes = store.resumes.filter(resume => resume.id !== id);
  store.deliveryRecords = store.deliveryRecords.filter(record => record.resumeId !== id);
  void runtime.saveStore(store, { allowResumeDeletes: true });
}

export function createNewResume(name: string): ResumeDocument {
  return saveResume(runtime.createNewResumeData(name, runtime.uuid));
}

export function duplicateResume(id: string, newName?: string): ResumeDocument | null {
  const original = getResume(id);
  if (!original) return null;

  const copy = clone(original);
  copy.id = runtime.uuid();
  copy.name = newName || `${original.name || '未命名简历'} 副本`;
  copy.created_at = new Date().toISOString();
  copy.updated_at = copy.created_at;
  return saveResume(copy);
}

Object.assign(window, {
  getAllResumes,
  getResume,
  getResumeById,
  saveResume,
  persistResume,
  deleteResume,
  createNewResume,
  duplicateResume
});
