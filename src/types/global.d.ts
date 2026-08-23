import type { ResumeStore } from './resume';

type Html2PdfFactory = () => {
  set(options: unknown): {
    from(element: HTMLElement): {
      save(): Promise<void>;
    };
  };
};

declare global {
  interface Window {
    deepCopy: <T>(value: T) => T;
    apiClient: {
      fetchStore: () => Promise<ResumeStore | null>;
      saveStore: (data: ResumeStore) => Promise<ResumeStore | null>;
    };
    html2pdf?: Html2PdfFactory;
    loadHtml2Pdf: () => Promise<Html2PdfFactory | null>;
  }
}

export {};
