import { stopAutoSave } from '../features/editor/save-controller';

export type AppRoute = 'home' | 'editor' | 'delivery' | 'profile';

interface EditStateLike {
  dirty: boolean;
}

interface ModalAction {
  label: string;
  cls?: string;
  callback?: () => void;
}

interface LegacyRuntime extends Window {
  currentRoute: AppRoute;
  profileDirty: boolean;
  profileEditData: unknown;
  editState: EditStateLike | null;
  showModal: (title: string, content: string, actions: ModalAction[]) => void;
  renderHomePage: () => void;
  loadEditor: (id?: string) => void;
  renderDeliveryView: () => void;
  initProfileEditor: () => void;
  navigate: typeof navigate;
  goBack: typeof goBack;
}

const runtime = window as unknown as LegacyRuntime;
let currentRoute: AppRoute = 'home';
let currentResumeId: string | undefined;

function setActiveView(route: AppRoute): void {
  document.querySelectorAll<HTMLElement>('.view').forEach(view => {
    view.classList.remove('active');
    view.style.display = 'none';
  });
  document.querySelectorAll<HTMLElement>('.nav-link').forEach(link => link.classList.remove('active'));

  const view = document.getElementById(`view-${route}`);
  if (view) {
    view.classList.add('active');
    view.style.display = route === 'editor' || route === 'profile' ? 'flex' : 'block';
  }
  document.querySelector<HTMLElement>(`.nav-link[data-route="${route}"]`)?.classList.add('active');
}

function updateHash(route: AppRoute, resumeId?: string): void {
  const target = route === 'editor' && resumeId ? `editor/${resumeId}` : route;
  if (window.location.hash.slice(1) !== target) window.location.hash = target;
}

export function navigate(route: AppRoute, resumeId?: string): void {
  if (currentRoute === 'profile' && route !== 'profile' && runtime.profileDirty) {
    runtime.showModal('未保存的修改', '<p>全局档案有未保存的修改，离开将丢失这些修改，确定离开吗？</p>', [
      { label: '留在当前页面', cls: 'btn-primary' },
      {
        label: '不保存并离开',
        cls: 'btn-danger',
        callback: () => {
          runtime.profileDirty = false;
          navigate(route, resumeId);
        }
      }
    ]);
    document.querySelectorAll<HTMLElement>('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.route === 'profile');
    });
    window.location.hash = 'profile';
    return;
  }

  if (currentRoute === 'editor' && route !== 'editor' && runtime.editState?.dirty) {
    runtime.showModal('未保存的修改', '<p>你有未保存的修改，离开将丢失这些修改，确定离开吗？</p>', [
      { label: '留在当前页面', cls: 'btn-primary' },
      {
        label: '不保存并离开',
        cls: 'btn-danger',
        callback: () => {
          if (runtime.editState) runtime.editState.dirty = false;
          navigate(route, resumeId);
        }
      }
    ]);
    updateHash('editor', currentResumeId);
    return;
  }

  if (currentRoute === 'editor' && route !== 'editor') stopAutoSave();

  currentRoute = route;
  runtime.currentRoute = route;
  setActiveView(route);

  if (route === 'home') {
    currentResumeId = undefined;
    runtime.editState = null;
    runtime.renderHomePage();
  } else if (route === 'editor') {
    currentResumeId = resumeId;
    runtime.loadEditor(resumeId);
  } else if (route === 'delivery') {
    runtime.renderDeliveryView();
  } else {
    runtime.initProfileEditor();
  }

  updateHash(route, resumeId);
}

export function goBack(): void {
  if (currentRoute === 'profile' && runtime.profileDirty) {
    navigate('home');
    return;
  }
  navigate('home');
}

function navigateFromHash(): void {
  const hash = window.location.hash.slice(1);
  if (hash.startsWith('editor/')) {
    navigate('editor', hash.slice('editor/'.length));
  } else if (hash === 'delivery' || hash === 'profile' || hash === 'home') {
    navigate(hash);
  } else {
    navigate('home');
  }
}

runtime.currentRoute = currentRoute;
runtime.profileDirty = false;
runtime.profileEditData = null;
runtime.navigate = navigate;
runtime.goBack = goBack;
window.addEventListener('hashchange', navigateFromHash);
