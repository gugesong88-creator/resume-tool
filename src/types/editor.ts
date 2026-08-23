import type { ResumeDocument, ResumeFormatting } from './resume';

export interface ResumeEditState {
  resume: ResumeDocument;
  formatting?: ResumeFormatting;
  dirty: boolean;
  changeRevision?: number;
  saveTimer?: number | null;
  _autoSaveInterval?: number;
}

export type SaveStatus = 'saved' | 'unsaved' | 'saving';
