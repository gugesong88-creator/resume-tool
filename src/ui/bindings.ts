import type { AppRoute } from '../app/router';
import { onFormatChange, togglePastePlainSetting, type FormattingKey } from '../features/editor/formatting';
import { onPhotoUpload } from '../features/editor/photo';
import { applySelectedTextColor, clearSelectedTextColor } from '../features/editor/rich-text-editor';
import {
  duplicateCurrentResume,
  onResumeNameChange,
  saveAsNew,
  saveCurrentResume
} from '../features/editor/save-controller';
import {
  autoCompressLayout,
  setEditorViewMode,
  toggleLeftPanel,
  type EditorViewMode
} from '../features/editor/editor-layout';
import { runProofreadCheck } from '../features/editor/proofread';
import { createEnglishResumeDraft } from '../features/editor/english-draft';
import { redo, undo } from '../features/editor/history';

interface StaticUiRuntime extends Window {
  navigate: (route: AppRoute) => void;
  createResume: () => void;
  goBack: () => void;
  exportMarkdown: () => void;
  exportVectorPDF: () => void;
  exportPDF: () => void;
  addDeliveryRecord: () => void;
  filterDeliveryRecords: () => void;
  saveGlobalProfile: () => void;
}

const runtime = window as unknown as StaticUiRuntime;

const clickActions: Record<string, () => void> = {
  createResume: () => runtime.createResume(),
  goBack: () => runtime.goBack(),
  undo,
  redo,
  exportMarkdown: () => runtime.exportMarkdown(),
  runProofreadCheck,
  createEnglishResumeDraft,
  autoCompressLayout,
  saveCurrentResume: () => { void saveCurrentResume(); },
  saveAsNew,
  duplicateCurrentResume,
  exportVectorPDF: () => runtime.exportVectorPDF(),
  exportPDF: () => runtime.exportPDF(),
  toggleLeftPanel,
  addDeliveryRecord: () => runtime.addDeliveryRecord(),
  saveGlobalProfile: () => runtime.saveGlobalProfile()
};

document.addEventListener('click', event => {
  const target = event.target as Element | null;
  const routeLink = target?.closest<HTMLElement>('[data-route]');
  if (routeLink?.dataset.route) {
    event.preventDefault();
    runtime.navigate(routeLink.dataset.route as AppRoute);
    return;
  }

  const viewButton = target?.closest<HTMLElement>('[data-view-mode]');
  if (viewButton?.dataset.viewMode) {
    setEditorViewMode(viewButton.dataset.viewMode as EditorViewMode);
    return;
  }

  const actionNode = target?.closest<HTMLElement>('[data-click-action]');
  const action = actionNode?.dataset.clickAction;
  if (action && clickActions[action]) clickActions[action]();
});

document.addEventListener('change', event => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;

  if (target.dataset.changeAction === 'photo') {
    onPhotoUpload(event);
  } else if (target.dataset.changeAction === 'resume-name') {
    onResumeNameChange(target.value);
  } else if (target.dataset.changeAction === 'paste-plain' && target instanceof HTMLInputElement) {
    togglePastePlainSetting(target.checked);
  } else if (target.dataset.changeAction === 'delivery-filter') {
    runtime.filterDeliveryRecords();
  }

  if (target.dataset.formatKey) onFormatChange(target.dataset.formatKey as FormattingKey, target.value);
});

document.addEventListener('input', event => {
  const target = event.target;
  if (target instanceof HTMLInputElement && target.dataset.inputAction === 'delivery-filter') {
    runtime.filterDeliveryRecords();
  }
});

document.addEventListener('mousedown', event => {
  const target = event.target as Element | null;
  const colorButton = target?.closest<HTMLElement>('[data-rich-text-color]');
  if (colorButton?.dataset.richTextColor) {
    event.preventDefault();
    applySelectedTextColor(colorButton.dataset.richTextColor);
    return;
  }
  if (target?.closest('[data-clear-rich-text-color]')) {
    event.preventDefault();
    clearSelectedTextColor();
  }
});
