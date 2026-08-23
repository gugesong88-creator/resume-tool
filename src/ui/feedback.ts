export interface ModalAction {
  label: string;
  cls?: string;
  callback?: () => boolean | void;
}

interface FeedbackRuntime extends Window {
  renderEditorPanels?: () => void;
}

const runtime = window as unknown as FeedbackRuntime;

export function showToast(message: string, duration = 2000): void {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

export function closeModal(): void {
  const container = document.getElementById('modal-container');
  if (container) container.replaceChildren();
  runtime.renderEditorPanels?.();
}

export function showModal(title: string, contentHtml: string, actions: ModalAction[]): void {
  const container = document.getElementById('modal-container');
  if (!container) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal';
  const heading = document.createElement('h3');
  heading.textContent = title;
  const content = document.createElement('div');
  content.className = 'confirm-content';
  content.innerHTML = contentHtml;
  const actionBar = document.createElement('div');
  actionBar.className = 'modal-actions';

  actions.forEach(action => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = action.cls || 'btn-outline';
    button.textContent = action.label;
    button.addEventListener('click', () => {
      try {
        if (action.callback?.() === false) return;
        closeModal();
      } catch (error) {
        console.error(error);
        showToast('操作失败，请打开控制台查看错误');
      }
    });
    actionBar.appendChild(button);
  });

  modal.append(heading, content, actionBar);
  overlay.appendChild(modal);
  overlay.addEventListener('click', event => {
    if (event.target === overlay) closeModal();
  });
  container.replaceChildren(overlay);
}

Object.assign(window, { showToast, showModal, closeModal });
