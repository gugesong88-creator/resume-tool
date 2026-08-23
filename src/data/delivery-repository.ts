import type { DeliveryRecord, ResumeStore } from '../types/resume';

interface DeliveryRepositoryRuntime extends Window {
  loadStore: () => ResumeStore;
  saveStore: (store: ResumeStore) => Promise<ResumeStore | null>;
}

const runtime = window as unknown as DeliveryRepositoryRuntime;

export function initDeliveryRecords(): void {
  const store = runtime.loadStore();
  if (!Array.isArray(store.deliveryRecords)) store.deliveryRecords = [];
}

export function loadDeliveryRecords(): DeliveryRecord[] {
  return [...(runtime.loadStore().deliveryRecords || [])];
}

export function saveDeliveryRecords(records: DeliveryRecord[]): void {
  const store = runtime.loadStore();
  store.deliveryRecords = records;
  void runtime.saveStore(store);
}

Object.assign(window, {
  initDeliveryRecords,
  loadDeliveryRecords,
  saveDeliveryRecords
});
