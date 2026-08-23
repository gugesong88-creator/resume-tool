export interface ResumeModuleItem {
  [key: string]: unknown;
  title?: string;
  role?: string;
  time?: string;
  label?: string;
  value?: string;
  school?: string;
  major?: string;
  company?: string;
  project_name?: string;
  bullets?: string[];
  details?: string[];
}

export interface ResumeModule {
  [key: string]: unknown;
  id: string;
  title: string;
  order: number;
  visible: boolean;
  deletable?: boolean;
  data?: Record<string, unknown>;
  items?: ResumeModuleItem[];
}

export interface ResumeFormatting {
  fontFamily: string;
  nameSize: number;
  headingSize: number;
  bodySize: number;
  lineHeight: number;
  textAlign: 'left' | 'justify';
  themeColor: string;
  marginY: number;
  marginX: number;
  moduleSpacing: number;
}

export interface ResumeDocument {
  [key: string]: unknown;
  id: string;
  name: string;
  schema_version?: number;
  template_id: 'T01_classic_dense';
  modules: Record<string, ResumeModule>;
  formatting?: Partial<ResumeFormatting>;
  meta?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export type DeliveryStatus = '已投递' | '面试邀请' | '已拒绝' | '已录用' | '待定';

export interface DeliveryRecord {
  [key: string]: unknown;
  id?: string;
  resumeId?: string;
  company?: string;
  position?: string;
  resumeName?: string;
  email?: string;
  date?: string;
  status?: DeliveryStatus;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProfileModule {
  [key: string]: unknown;
  id: string;
  title: string;
  visible: boolean;
  data?: Record<string, string>;
  items: ResumeModuleItem[];
}

export type GlobalProfile = Record<string, ProfileModule>;

export interface ResumeStore {
  schema_version?: number;
  resumes: ResumeDocument[];
  deliveryRecords: DeliveryRecord[];
  settings: Record<string, unknown>;
  globalProfile?: GlobalProfile;
}
