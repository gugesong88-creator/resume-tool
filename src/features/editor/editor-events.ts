import {
  addBullet,
  addEntry,
  deleteEntry,
  swapEntries,
  updateBullet,
  updateItemField,
  updateModuleField
} from './entry-operations';
import { toggleGlobalProfileLink } from './global-profile-link';
import {
  confirmModuleDeletion,
  moveModule,
  toggleModulePanel,
  toggleModuleVisibility
} from './module-controls';
import { openPhotoPicker, removePhoto } from './photo';

function readIndex(element: HTMLElement, key: 'entryIndex' | 'bulletIndex' | 'swapTarget'): number {
  return Number(element.dataset[key]);
}

document.addEventListener('click', event => {
  const actionNode = (event.target as Element | null)?.closest<HTMLElement>('[data-entry-action]');
  if (!actionNode) return;
  const moduleId = actionNode.dataset.module;
  if (!moduleId) return;

  event.preventDefault();
  event.stopPropagation();
  const entryIndex = readIndex(actionNode, 'entryIndex');
  switch (actionNode.dataset.entryAction) {
    case 'add':
      addEntry(moduleId);
      break;
    case 'delete':
      deleteEntry(moduleId, entryIndex);
      break;
    case 'add-bullet':
      addBullet(moduleId, entryIndex);
      break;
    case 'swap':
      swapEntries(moduleId, entryIndex, readIndex(actionNode, 'swapTarget'));
      break;
  }
});

document.addEventListener('click', event => {
  const actionNode = (event.target as Element | null)?.closest<HTMLElement>('[data-module-action]');
  if (!actionNode) return;
  const moduleId = actionNode.dataset.module;
  if (!moduleId) return;

  event.preventDefault();
  event.stopPropagation();
  switch (actionNode.dataset.moduleAction) {
    case 'toggle-panel':
      toggleModulePanel(moduleId);
      break;
    case 'move-up':
      moveModule(moduleId, -1);
      break;
    case 'move-down':
      moveModule(moduleId, 1);
      break;
    case 'toggle-visible':
      toggleModuleVisibility(moduleId);
      break;
    case 'delete':
      confirmModuleDeletion(moduleId);
      break;
  }
});

document.addEventListener('click', event => {
  const actionNode = (event.target as Element | null)?.closest<HTMLElement>('[data-photo-action]');
  if (!actionNode) return;
  event.preventDefault();
  if (actionNode.dataset.photoAction === 'upload') openPhotoPicker();
  if (actionNode.dataset.photoAction === 'remove') removePhoto();
});

document.addEventListener('input', event => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return;
  const moduleId = input.dataset.module;
  if (!moduleId) return;

  if (input.dataset.moduleField) {
    updateModuleField(moduleId, input.dataset.moduleField, input.value);
  } else if (input.dataset.itemField) {
    updateItemField(moduleId, readIndex(input, 'entryIndex'), input.dataset.itemField, input.value);
  } else if (input.dataset.bulletField !== undefined) {
    updateBullet(
      moduleId,
      readIndex(input, 'entryIndex'),
      readIndex(input, 'bulletIndex'),
      input.value
    );
  }
});

document.addEventListener('change', event => {
  const checkbox = event.target;
  if (!(checkbox instanceof HTMLInputElement) || checkbox.dataset.linkGlobal === undefined) return;
  const moduleId = checkbox.dataset.module;
  if (moduleId) toggleGlobalProfileLink(moduleId, checkbox.checked);
});

document.addEventListener('keydown', event => {
  const textarea = event.target;
  if (!(textarea instanceof HTMLTextAreaElement) || textarea.dataset.bulletField === undefined) return;
  if (event.key !== 'Enter' || event.shiftKey) return;
  const moduleId = textarea.dataset.module;
  if (!moduleId) return;
  event.preventDefault();
  addBullet(moduleId, readIndex(textarea, 'entryIndex'));
});
