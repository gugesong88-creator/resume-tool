interface PhotoData {
  photo?: string;
}

interface PhotoModule {
  data?: PhotoData;
}

interface PhotoRuntime extends Window {
  currentRoute: string;
  profileEditData: { basic_info?: PhotoModule } | null;
  profileDirty: boolean;
  editState: { resume: { modules: { basic_info?: PhotoModule } } } | null;
  renderProfileEditor?: () => void;
  renderProfilePreview?: () => void;
  renderEditorPanels?: () => void;
  renderPreview: () => void;
  markDirty: () => void;
  showToast: (message: string) => void;
}

const runtime = window as unknown as PhotoRuntime;

function readAsDataUrl(file: File, onLoad: (dataUrl: string) => void): void {
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    if (typeof reader.result === 'string') onLoad(reader.result);
  });
  reader.readAsDataURL(file);
}

export function onPhotoUpload(event: Event): void {
  const input = event.target as HTMLInputElement | null;
  const file = input?.files?.[0];
  if (!file) return;

  if (runtime.currentRoute === 'profile') {
    const basicInfo = runtime.profileEditData?.basic_info;
    if (!basicInfo?.data) return;
    readAsDataUrl(file, dataUrl => {
      const currentBasicInfo = runtime.profileEditData?.basic_info;
      if (!currentBasicInfo?.data) return;
      currentBasicInfo.data.photo = dataUrl;
      runtime.renderProfileEditor?.();
      runtime.renderProfilePreview?.();
      runtime.profileDirty = true;
      runtime.showToast('照片已上传');
    });
    return;
  }

  const basicInfo = runtime.editState?.resume.modules.basic_info;
  if (!basicInfo?.data) return;
  readAsDataUrl(file, dataUrl => {
    const currentBasicInfo = runtime.editState?.resume.modules.basic_info;
    if (!currentBasicInfo?.data) return;
    currentBasicInfo.data.photo = dataUrl;
    runtime.renderEditorPanels?.();
    runtime.renderPreview();
    runtime.markDirty();
    runtime.showToast('照片已上传');
  });
}

export function openPhotoPicker(): void {
  document.getElementById('photo-upload-input')?.click();
}

export function removePhoto(): void {
  if (runtime.currentRoute === 'profile') {
    const basicInfo = runtime.profileEditData?.basic_info;
    if (!basicInfo?.data) return;
    basicInfo.data.photo = '';
    runtime.renderProfileEditor?.();
    runtime.renderProfilePreview?.();
    runtime.profileDirty = true;
    return;
  }

  const basicInfo = runtime.editState?.resume.modules.basic_info;
  if (!basicInfo?.data) return;
  basicInfo.data.photo = '';
  runtime.renderEditorPanels?.();
  runtime.renderPreview();
  runtime.markDirty();
}
