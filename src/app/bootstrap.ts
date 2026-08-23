import { initDeliveryRecords } from '../data/delivery-repository';
import { getGlobalProfile } from '../data/profile-repository';
import type { GlobalProfile } from '../types/resume';
import { navigate } from './router';

interface BootstrapRuntime extends Window {
  appStore: { load: () => Promise<unknown> };
  globalProfile?: GlobalProfile;
}

const runtime = window as unknown as BootstrapRuntime;

export async function bootstrap(): Promise<void> {
  await runtime.appStore.load();
  runtime.globalProfile = getGlobalProfile();
  initDeliveryRecords();

  const hash = window.location.hash.slice(1);
  if (hash.startsWith('editor/')) navigate('editor', hash.slice('editor/'.length));
  else if (hash === 'delivery') navigate('delivery');
  else if (hash === 'profile') navigate('profile');
  else navigate('home');
}
