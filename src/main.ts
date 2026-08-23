import '../assets/styles/base.css';
import '../assets/styles/delivery.css';
import '../assets/styles/editor.css';
import '../assets/styles/templates.css';

import './schema.js';
import './modules/export.js';
import './api/client';
import './store.js';
import './utils/time.js';
import './utils/html.js';
import './utils/clone';
import './ui/feedback';
import './features/editor/editor-renderer';
import './features/editor/formatting';
import './features/editor/preview';
import './features/editor/editor-events';
import './templates/t01-classic-dense.js';
import './templates/index.js';
import './data/resume-repository';
import './features/editor/save-controller';
import './features/editor/editor-layout';
import './features/editor/proofread';
import './features/editor/english-draft';
import './features/editor/history';
import './features/editor/editor-session';
import './features/storage/storage-status';
import './data/delivery-repository';
import './data/profile-repository';
import './features/home/home';
import './features/delivery/delivery';
import './features/profile/profile';
import './app/router';
import './ui/bindings';
import { bootstrap } from './app/bootstrap';

window.loadHtml2Pdf = async () => {
  if (typeof window.html2pdf === 'function') return window.html2pdf;
  await import('../assets/libs/html2pdf.bundle.min.js');
  return typeof window.html2pdf === 'function' ? window.html2pdf : null;
};

void bootstrap();
