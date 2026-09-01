const assert = require('node:assert/strict');
const { after, afterEach, before, beforeEach, test } = require('node:test');
const { createE2EEnvironment } = require('./helpers/environment');
const { createFixtureStore } = require('./helpers/fixtures');

let environment;
let page;
let pageErrors;

before(async () => {
  environment = await createE2EEnvironment();
});

beforeEach(() => {
  environment.resetStore(createFixtureStore());
  page = null;
  pageErrors = [];
});

afterEach(async () => {
  if (page && !page.isClosed()) await page.close();
});

after(async () => {
  if (environment) await environment.close();
});

async function open(pathname) {
  ({ page, pageErrors } = await environment.newPage(pathname));
  return page;
}

async function openEditor() {
  await open('/#editor/e2e-resume');
  await page.waitForSelector('#view-editor.active #a4-preview.t01-classic-dense');
  return page;
}

function assertNoPageErrors() {
  assert.deepEqual(pageErrors, []);
}

test('生产构建只暴露经典模板，并阻止访问项目私有文件', async () => {
  const apiResponse = await fetch(`${environment.origin}/api/store`);
  assert.equal(apiResponse.status, 200);
  const apiStore = await apiResponse.json();
  assert.equal(apiStore.schema_version, 3);
  assert.equal(apiStore.resumes[0].template_id, 'T01_classic_dense');

  for (const privatePath of [
    '/.env.example',
    '/.git/config',
    '/data/resumes.json',
    '/package.json',
    '/src/main.ts'
  ]) {
    const response = await fetch(`${environment.origin}${privatePath}`);
    assert.equal(response.status, 404, `${privatePath} 不应被静态服务暴露`);
  }

  await open('/resume_chatgpt_stable_clean_v9.html#editor/e2e-resume');
  await page.waitForSelector('#view-editor.active #a4-preview.t01-classic-dense');

  const state = await page.evaluate(() => ({
    templateOptions: Array.from(document.querySelectorAll('#editor-template-select option')).map(option => option.value),
    templateRegistry: Object.keys(window.AppTemplates || {}),
    schemaVersion: window.ResumeSchema && window.ResumeSchema.SCHEMA_VERSION,
    pdfEngineLoadedAtStartup: typeof window.html2pdf === 'function',
    previewText: document.getElementById('a4-preview').innerText
  }));

  assert.deepEqual(state.templateOptions, ['T01_classic_dense']);
  assert.deepEqual(state.templateRegistry, ['T01_classic_dense']);
  assert.equal(state.schemaVersion, 3);
  assert.equal(state.pdfEngineLoadedAtStartup, false);
  assert.match(state.previewText, /测试用户/);
  assert.match(state.previewText, /甲方示例公司/);

  assert.equal(await page.$eval('#storage-status-btn', button => button.hasAttribute('onclick')), false);
  await page.click('#storage-status-btn');
  await page.waitForSelector('.modal-overlay');
  assert.equal(await page.$eval('.modal h3', element => element.textContent), '本地存储状态');
  assert.match(await page.$eval('.confirm-content', element => element.textContent), /简历数量：1 份/);
  assert.match(await page.$eval('.confirm-content', element => element.textContent), /JSON 数据体积：[0-9.]+ KB/);
  await page.click('.modal-actions button');
  assertNoPageErrors();
});

test('首页、投递记录和全局档案主流程可以完成并持久化', async () => {
  await openEditor();

  await page.click('.nav-link[data-route="delivery"]');
  await page.waitForSelector('#view-delivery.active');
  assert.equal(await page.evaluate(() => window.location.hash), '#delivery');
  assert.equal(await page.$eval('#delivery-table-body', element => element.innerHTML.includes('onchange=')), false);

  await page.click('#view-delivery [data-click-action="addDeliveryRecord"]');
  await page.waitForSelector('.modal-overlay');
  assert.equal(await page.$eval('.modal-overlay', element => element.hasAttribute('onclick')), false);
  await page.type('#delivery-company', '新增测试公司');
  await page.type('#delivery-position', '新增测试岗位');
  await page.type('#delivery-email', 'new@example.com');
  await page.click('.modal-actions button:last-child');
  await page.waitForFunction(() => document.querySelectorAll('#delivery-table-body tr').length === 2);

  await page.select('[data-delivery-id="e2e-delivery"][data-delivery-status]', '面试邀请');
  await environment.waitForStore(
    store => store.deliveryRecords[0]?.status === '面试邀请',
    { message: '投递状态没有持久化' }
  );

  await page.type('#company-filter', '不存在的公司');
  await page.waitForFunction(() => document.querySelectorAll('#delivery-table-body tr').length === 0);
  await page.$eval('#company-filter', input => {
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForSelector('#delivery-table-body tr');

  await page.click('.nav-link[data-route="home"]');
  await page.waitForSelector('#view-home.active');
  assert.equal(await page.evaluate(() => window.location.hash), '#home');
  assert.equal(await page.$eval('#resume-list', element => element.innerHTML.includes('onclick=')), false);
  assert.match(await page.$eval('#resume-list', element => element.textContent), /面试邀请/);

  await page.click('#view-home [data-click-action="createResume"]');
  await page.waitForSelector('.modal-overlay');
  await page.click('.modal-actions button:first-child');
  await page.waitForFunction(() => !document.querySelector('.modal-overlay'));

  await page.click('.nav-link[data-route="profile"]');
  await page.waitForSelector('#view-profile.active [data-profile-panel-toggle]');
  assert.equal(await page.$eval('[data-profile-panel-toggle]', element => element.hasAttribute('onclick')), false);
  const educationToggle = '#profile-editor-left [data-module="education"] [data-profile-panel-toggle]';
  await page.evaluate(selector => document.querySelector(selector)?.click(), educationToggle);
  assert.equal(
    await page.$eval('#profile-editor-left [data-module="education"] .module-panel-body', element => element.style.display),
    'none'
  );
  await page.evaluate(selector => document.querySelector(selector)?.click(), educationToggle);

  const profileEducationEntries = '#profile-editor-left [data-module="education"] .entry-item';
  assert.equal(await page.$$eval(profileEducationEntries, nodes => nodes.length), 1);
  const addEducationEntry = '#profile-editor-left [data-module="education"] .add-entry-btn';
  await page.evaluate(selector => document.querySelector(selector)?.click(), addEducationEntry);
  await page.waitForFunction(selector => document.querySelectorAll(selector).length === 2, {}, profileEducationEntries);
  page.once('dialog', dialog => dialog.accept());
  await page.$$eval(`${profileEducationEntries} .btn-danger`, buttons => buttons[buttons.length - 1].click());
  await page.waitForFunction(selector => document.querySelectorAll(selector).length === 1, {}, profileEducationEntries);

  const profileNameInput = '#profile-editor-left [data-module="basic_info"] input[placeholder="张三"]';
  await page.$eval(profileNameInput, input => {
    input.value = '全局测试用户';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForFunction(() => document.getElementById('profile-save-status')?.textContent === '未保存');
  await page.click('#view-profile [data-click-action="saveGlobalProfile"]');
  await environment.waitForStore(
    store => store.globalProfile?.basic_info?.data?.name === '全局测试用户',
    { message: '全局档案没有持久化' }
  );
  assert.equal(await page.$eval('#profile-save-status', element => element.textContent), '已保存');

  await page.click('.nav-link[data-route="home"]');
  await page.waitForSelector('#view-home.active');
  const editResumeSelector = '[data-resume-action="edit"][data-resume-id="e2e-resume"]';
  await page.waitForSelector(editResumeSelector);
  await page.evaluate(selector => document.querySelector(selector)?.click(), editResumeSelector);
  await page.waitForSelector('#view-editor.active');
  assertNoPageErrors();
});

test('编辑器保存后，简历名称和格式在刷新后保持不变', async () => {
  await openEditor();

  await page.$eval('#editor-resume-name', input => {
    input.value = '编辑器持久化测试';
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.$eval('#fmt-theme-color', input => {
    input.value = '#dc2626';
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.$eval('#fmt-margin-y', input => {
    input.value = '0';
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.$eval('#fmt-body-size', input => {
    input.value = '12.5';
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.select('#fmt-text-align', 'left');
  await page.click('#fmt-paste-plain');
  await page.click('[data-click-action="saveCurrentResume"]');

  await environment.waitForStore(
    store => {
      const resume = store.resumes.find(item => item.id === 'e2e-resume');
      return resume?.name === '编辑器持久化测试'
        && resume?.formatting?.themeColor === '#dc2626'
        && resume?.formatting?.marginY === 0
        && resume?.formatting?.bodySize === 12.5
        && resume?.formatting?.textAlign === 'left'
        && store.settings?.paste_plain === false;
    },
    { message: '编辑器名称或格式没有持久化' }
  );

  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('#view-editor.active #a4-preview.t01-classic-dense');
  assert.equal(await page.$eval('#editor-resume-name', input => input.value), '编辑器持久化测试');
  assert.equal(await page.$eval('#fmt-theme-color', input => input.value), '#dc2626');
  assert.equal(await page.$eval('#fmt-margin-y', input => input.value), '0');
  assert.equal(await page.$eval('#fmt-body-size', input => input.value), '12.5');
  assert.equal(await page.$eval('#fmt-text-align', input => input.value), 'left');
  assert.equal(await page.$eval('#fmt-paste-plain', input => input.checked), false);
  assert.equal(
    await page.$eval('#a4-preview', element => element.style.getPropertyValue('--accent')),
    '#dc2626'
  );
  assert.equal(await page.$eval('#a4-preview', element => element.style.paddingTop), '0px');
  assert.equal(await page.$eval('#a4-preview .exp-desc', element => element.style.fontSize), '12.5px');
  assert.equal(await page.$eval('#a4-preview .exp-desc', element => element.style.textAlign), 'left');
  assertNoPageErrors();
});

test('编辑器修改会防抖自动保存，并在磁盘确认后更新状态', async () => {
  await openEditor();
  await page.$eval('#editor-resume-name', input => {
    input.value = '自动保存回归测试';
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  assert.equal(await page.$eval('#save-status', element => element.textContent), '● 有未保存修改');
  await environment.waitForStore(
    store => store.resumes.find(resume => resume.id === 'e2e-resume')?.name === '自动保存回归测试',
    { timeout: process.env.CI ? 15000 : 6000, message: '防抖自动保存没有写入磁盘' }
  );
  await page.waitForFunction(() => document.getElementById('save-status')?.textContent === '✓ 已保存');
  assert.equal(await page.evaluate(() => window.editState?.dirty), false);
  assertNoPageErrors();
});

test('另存为保留原件，复制当前简历会先保存来源再创建副本', async () => {
  await openEditor();
  const titleInput = '.module-panel[data-module="internship"] input[data-item-field="title"]';
  await page.$eval(titleInput, input => {
    input.value = '仅存在于另存版本的公司';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  await page.click('[data-click-action="saveAsNew"]');
  await page.waitForSelector('#saveas-name');
  await page.$eval('#saveas-name', input => { input.value = '另存版本'; });
  await page.click('.modal-actions button:last-child');
  await page.waitForFunction(() => window.editState?.resume?.name === '另存版本');

  const afterSaveAs = await environment.waitForStore(
    store => store.resumes.length === 2
      && store.resumes.some(resume => resume.name === '另存版本'),
    { message: '另存为没有创建新简历' }
  );
  const original = afterSaveAs.resumes.find(resume => resume.id === 'e2e-resume');
  const savedAs = afterSaveAs.resumes.find(resume => resume.name === '另存版本');
  assert.equal(original.modules.internship.items[0].title, '甲方示例公司');
  assert.equal(savedAs.modules.internship.items[0].title, '仅存在于另存版本的公司');

  const roleInput = '.module-panel[data-module="internship"] input[data-item-field="role"]';
  await page.$eval(roleInput, input => {
    input.value = '复制前尚未保存的岗位';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.click('[data-click-action="duplicateCurrentResume"]');
  await page.waitForSelector('#duplicate-current-name');
  await page.$eval('#duplicate-current-name', input => { input.value = '再次复制版本'; });
  await page.click('.modal-actions button:last-child');
  await page.waitForFunction(() => window.editState?.resume?.name === '再次复制版本');

  const afterDuplicate = await environment.waitForStore(
    store => store.resumes.length === 3
      && store.resumes.some(resume => resume.name === '再次复制版本'),
    { message: '复制当前简历没有创建副本' }
  );
  const persistedSource = afterDuplicate.resumes.find(resume => resume.id === savedAs.id);
  const duplicate = afterDuplicate.resumes.find(resume => resume.name === '再次复制版本');
  assert.equal(persistedSource.modules.internship.items[0].role, '复制前尚未保存的岗位');
  assert.equal(duplicate.modules.internship.items[0].role, '复制前尚未保存的岗位');
  assertNoPageErrors();
});

test('编辑器视图模式、左栏折叠和一页压缩可以协同工作', async () => {
  const store = createFixtureStore();
  store.resumes[0].modules.internship.items[0].bullets = Array.from(
    { length: 80 },
    (_, index) => `第 ${index + 1} 条用于检测超页压缩的较长简历内容。`
  );
  environment.resetStore(store);
  await openEditor();

  await page.click('#view-mode-preview');
  assert.equal(await page.$eval('#view-editor', element => element.classList.contains('preview-only')), true);
  assert.equal(await page.$eval('#editor-left-panel', element => getComputedStyle(element).display), 'none');
  await page.click('#view-mode-edit');
  assert.equal(await page.$eval('#view-editor', element => element.classList.contains('edit-only')), true);
  assert.equal(await page.$eval('#view-editor .editor-right', element => getComputedStyle(element).display), 'none');
  await page.click('#view-mode-split');
  assert.equal(await page.$eval('#view-editor', element => element.classList.contains('split-mode')), true);

  await page.click('[data-click-action="toggleLeftPanel"]');
  assert.equal(await page.$eval('#editor-left-panel', element => element.classList.contains('collapsed')), true);
  await page.click('[data-click-action="toggleLeftPanel"]');
  assert.equal(await page.$eval('#editor-left-panel', element => element.classList.contains('collapsed')), false);

  await page.waitForFunction(() => document.getElementById('page-overflow-warning')?.style.display === 'inline-block');
  const beforeBodySize = await page.evaluate(() => window.editState.formatting.bodySize);
  await page.click('[data-click-action="autoCompressLayout"]');
  await page.waitForFunction(size => window.editState?.formatting?.bodySize < size, {}, beforeBodySize);
  assert.equal(await page.$eval('#fmt-body-size', input => Number(input.value)), 10.5);
  assert.equal(await page.evaluate(() => window.editState?.dirty), true);
  assertNoPageErrors();
});

test('标点检查可以报告问题并执行保守修复', async () => {
  await openEditor();
  const bullet = '.module-panel[data-module="internship"] textarea[data-bullet-index="0"]';
  await page.$eval(bullet, textarea => {
    textarea.value = '完成  测试,并检查!!';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });

  await page.click('[data-click-action="runProofreadCheck"]');
  await page.waitForSelector('.modal-overlay .proof-report');
  assert.match(await page.$eval('.modal h3', element => element.textContent), /错别字 \/ 标点检查（[1-9]/);
  assert.match(await page.$eval('.proof-summary', element => element.textContent), /多余空格|中文后半角标点|重复标点/);
  await page.click('.modal-actions button:last-child');
  await page.waitForFunction(() => {
    const value = window.editState?.resume?.modules?.internship?.items?.[0]?.bullets?.[0];
    return value === '完成测试，并检查！' && !document.querySelector('.modal-overlay');
  });
  assert.match(await page.$eval('#a4-preview', element => element.textContent), /完成测试，并检查！/);
  assert.equal(await page.evaluate(() => window.editState?.dirty), true);
  assertNoPageErrors();
});

test('英文草稿会先保存来源，再持久化并打开独立副本', async () => {
  await openEditor();
  await page.click('[data-click-action="createEnglishResumeDraft"]');
  await page.waitForSelector('#english-resume-name');
  await page.$eval('#english-resume-name', input => { input.value = 'English Regression'; });
  await page.click('.modal-actions button:last-child');
  await page.waitForFunction(() => {
    const resume = window.editState?.resume;
    return resume?.name === 'English Regression'
      && resume?.language === 'en'
      && resume?.modules?.internship?.title === 'Internship Experience';
  });

  const persisted = await environment.waitForStore(
    store => store.resumes.length === 2
      && store.resumes.some(resume => resume.name === 'English Regression' && resume.language === 'en'),
    { message: '英文草稿没有持久化' }
  );
  const draft = persisted.resumes.find(resume => resume.name === 'English Regression');
  assert.equal(draft.modules.education.title, 'Education');
  assert.match(draft.meta.note, /English draft generated/);
  assert.equal(persisted.resumes.some(resume => resume.id === 'e2e-resume'), true);
  assertNoPageErrors();
});

test('格式修改支持撤销和重做，并同步更新预览', async () => {
  await openEditor();
  await page.waitForFunction(() => window.historyStack.length === 1);

  const initialColor = await page.$eval('#fmt-theme-color', input => input.value);
  await page.$eval('#fmt-theme-color', input => {
    input.value = '#dc2626';
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForFunction(() => window.historyStack.length >= 2, { timeout: 5000 });

  await page.click('#btn-undo');
  await page.waitForFunction(color => {
    const input = document.getElementById('fmt-theme-color');
    const preview = document.getElementById('a4-preview');
    return input?.value === color
      && preview?.style.getPropertyValue('--accent').toLowerCase() === color.toLowerCase();
  }, {}, initialColor);

  await page.click('#btn-redo');
  await page.waitForFunction(() => {
    const input = document.getElementById('fmt-theme-color');
    const preview = document.getElementById('a4-preview');
    return input?.value === '#dc2626' && preview?.style.getPropertyValue('--accent') === '#dc2626';
  });
  await environment.waitForStore(
    store => store.resumes.find(resume => resume.id === 'e2e-resume')?.formatting?.themeColor === '#dc2626',
    { message: '重做后的状态没有通过统一保存队列持久化' }
  );
  assertNoPageErrors();
});

test('预览富文本编辑会净化内容、保存选区颜色并在刷新后恢复', async () => {
  await openEditor();
  const titleSelector = '#a4-preview [data-editable="internship.0.title"]';

  assert.equal(await page.$eval(titleSelector, element => element.contentEditable), 'true');
  await page.$eval(titleSelector, element => {
    element.focus();
    element.innerHTML = '<div><span style="color: rgb(220, 38, 38); background: yellow" onclick="alert(1)">富文本公司</span><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" onerror="alert(2)"></div>';
    element.blur();
  });
  await page.waitForFunction(() => {
    const title = window.editState?.resume?.modules?.internship?.items?.[0]?.title;
    return typeof title === 'string'
      && title.includes('富文本公司')
      && title.includes('color:')
      && !title.includes('onclick')
      && !title.includes('background')
      && !title.includes('<img');
  });

  await page.evaluate(() => {
    const editable = document.querySelector('[data-editable="internship.0._bullets"]');
    const listItem = editable?.querySelector('li');
    if (!editable || !listItem) throw new Error('找不到可编辑的实习要点');
    editable.focus();
    const range = document.createRange();
    range.selectNodeContents(listItem);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
  await page.click('[data-rich-text-color="#DC2626"]');
  await page.waitForFunction(() => {
    const bullet = window.editState?.resume?.modules?.internship?.items?.[0]?.bullets?.[0];
    return typeof bullet === 'string' && bullet.includes('color:');
  });

  await page.click('[data-click-action="saveCurrentResume"]');
  await environment.waitForStore(
    store => {
      const item = store.resumes.find(resume => resume.id === 'e2e-resume')
        ?.modules?.internship?.items?.[0];
      return item?.title?.includes('富文本公司')
        && item.title.includes('color:')
        && !item.title.includes('onclick')
        && !item.title.includes('background')
        && !item.title.includes('<img')
        && item.bullets?.[0]?.includes('color:');
    },
    { message: '富文本内容或选区颜色没有持久化' }
  );

  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('#view-editor.active #a4-preview.t01-classic-dense');
  assert.equal(await page.$eval(titleSelector, element => element.textContent.trim()), '富文本公司');
  assert.equal(
    await page.$eval(`${titleSelector} span`, element => getComputedStyle(element).color),
    'rgb(220, 38, 38)'
  );
  assert.match(
    await page.$eval('[data-editable="internship.0._bullets"] li', element => element.textContent),
    /完成结构化简历工具回归测试/
  );
  assertNoPageErrors();
});

test('自动保存不会打断预览区的连续编辑', async () => {
  await openEditor();
  const titleSelector = '#a4-preview [data-editable="internship.0.title"]';

  await page.$eval(titleSelector, element => {
    element.focus();
    element.textContent = '';
  });
  await page.keyboard.type('自动保存连续编辑');
  await page.waitForFunction(() => document.getElementById('save-status')?.textContent === '● 有未保存修改');
  await page.waitForFunction(() => document.getElementById('save-status')?.textContent === '✓ 已保存', { timeout: 8000 });

  assert.equal(
    await page.evaluate(() => document.activeElement?.getAttribute('data-editable')),
    'internship.0.title'
  );
  await page.keyboard.type('后续输入');
  assert.equal(await page.$eval(titleSelector, element => element.textContent), '自动保存连续编辑后续输入');
  assert.equal(
    await page.evaluate(() => window.editState?.resume?.modules?.internship?.items?.[0]?.title),
    '自动保存连续编辑后续输入'
  );

  const persisted = await environment.waitForStore(
    store => store.resumes.find(resume => resume.id === 'e2e-resume')
      ?.modules?.internship?.items?.[0]?.title === '自动保存连续编辑',
    { message: '自动保存没有持久化正在编辑的预览内容' }
  );
  assert.ok(persisted);
  assertNoPageErrors();
});

test('实习条目可以添加、删除和调整顺序', async () => {
  await openEditor();
  const panel = '.module-panel[data-module="internship"]';
  const entries = `${panel} .entry-item`;

  assert.equal(await page.$$eval(entries, nodes => nodes.length), 2);
  assert.equal(
    await page.$eval(`${panel} .module-panel-body`, element => /on(?:click|input|change|keydown)=/i.test(element.innerHTML)),
    false
  );
  assert.equal(await page.$eval('#a4-preview .entry-delete-btn', button => button.hasAttribute('onclick')), false);

  await page.$eval(`${panel} .entry-item input[data-item-field="title"]`, input => {
    input.value = '更新后的甲方公司';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForFunction(() => {
    const item = window.editState?.resume?.modules?.internship?.items?.[0];
    return item?.title === '更新后的甲方公司'
      && document.getElementById('a4-preview')?.textContent.includes('更新后的甲方公司');
  });

  await page.$eval(`${panel} .entry-item .add-bullet`, button => button.click());
  await page.waitForFunction(() => window.editState?.resume?.modules?.internship?.items?.[0]?.bullets?.length === 2);
  await page.$eval(`${panel} .entry-item textarea[data-bullet-index="1"]`, textarea => {
    textarea.value = '新增的测试要点';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForFunction(() => {
    const bullets = window.editState?.resume?.modules?.internship?.items?.[0]?.bullets;
    return bullets?.[1] === '新增的测试要点';
  });

  await page.click(`${panel} .add-entry-btn`);
  await page.waitForFunction(selector => document.querySelectorAll(selector).length === 3, {}, entries);

  page.once('dialog', dialog => dialog.accept());
  await page.$$eval(`${panel} .entry-item .btn-danger`, buttons => buttons[buttons.length - 1].click());
  await page.waitForFunction(selector => document.querySelectorAll(selector).length === 2, {}, entries);

  await page.click(`${panel} .v6-enhance-box button[title="后移"]`);
  await page.waitForFunction(selector => {
    const titles = Array.from(document.querySelectorAll(`${selector} .entry-title`));
    return titles[0]?.textContent.includes('乙方示例公司');
  }, {}, panel);
  assert.deepEqual(
    await page.$$eval(`${panel} .entry-title`, nodes => nodes.map(node => node.textContent.trim())),
    ['乙方示例公司', '更新后的甲方公司']
  );

  const previewInternshipSection = '#a4-preview .section:has([data-entry-action="add"][data-module="internship"])';
  await page.hover(previewInternshipSection);
  await page.click('#a4-preview [data-entry-action="add"][data-module="internship"]');
  await page.waitForFunction(selector => document.querySelectorAll(selector).length === 3, {}, entries);
  page.once('dialog', dialog => dialog.accept());
  const lastPreviewEntry = '#a4-preview .entry-wrapper:has(.entry-delete-btn[data-module="internship"][data-entry-index="2"])';
  await page.hover(lastPreviewEntry);
  await page.click(`${lastPreviewEntry} .entry-delete-btn`);
  await page.waitForFunction(selector => document.querySelectorAll(selector).length === 2, {}, entries);
  assertNoPageErrors();
});

test('模块可以展开、排序、隐藏和确认删除', async () => {
  await openEditor();
  const panel = '#editor-left-panel .module-panel[data-module="internship"]';
  const panelBody = `${panel} .module-panel-body`;

  assert.equal(await page.$eval(panel, element => /on(?:click|input|change|keydown)=/i.test(element.innerHTML)), false);
  await page.click(`${panel} .module-panel-title`);
  await page.waitForFunction(selector => document.querySelector(selector)?.style.display === 'none', {}, panelBody);
  await page.click(`${panel} .module-panel-title`);
  await page.waitForFunction(selector => document.querySelector(selector)?.style.display !== 'none', {}, panelBody);

  await page.click(`${panel} [data-module-action="move-up"]`);
  await page.waitForFunction(() => {
    const ids = Array.from(document.querySelectorAll('#editor-left-panel .module-panel'))
      .map(panelNode => panelNode.dataset.module);
    return ids[1] === 'internship' && ids[2] === 'education';
  });
  await page.click(`${panel} [data-module-action="move-down"]`);
  await page.waitForFunction(() => window.editState?.resume?.modules?.internship?.order === 3);

  const previewVisibility = '#a4-preview [data-module-action="toggle-visible"][data-module="internship"]';
  assert.equal(await page.$eval(previewVisibility, button => button.hasAttribute('onclick')), false);
  await page.hover(`#a4-preview .section:has(${previewVisibility.replace('#a4-preview ', '')})`);
  await page.click(previewVisibility);
  await page.waitForFunction(() => {
    const module = window.editState?.resume?.modules?.internship;
    return module?.visible === false
      && !document.getElementById('a4-preview')?.textContent.includes('实习经历');
  });
  await page.click(`${panel} [data-module-action="toggle-visible"]`);
  await page.waitForFunction(() => window.editState?.resume?.modules?.internship?.visible === true);

  await page.click(`${panel} [data-module-action="delete"]`);
  await page.waitForSelector('.modal-overlay');
  await page.click('.modal-actions button:last-child');
  await page.waitForFunction(() => {
    const module = window.editState?.resume?.modules?.internship;
    return module?.visible === false && module?.items?.length === 0;
  });
  await page.click('[data-click-action="saveCurrentResume"]');
  await environment.waitForStore(
    store => {
      const module = store.resumes[0]?.modules?.internship;
      return module?.visible === false && module?.items?.length === 0;
    },
    { message: '模块删除结果没有持久化' }
  );
  assertNoPageErrors();
});

test('编辑器和全局档案可以通过事件代理移除照片', async () => {
  const store = createFixtureStore();
  const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  store.resumes[0].modules.basic_info.data.photo = tinyPng;
  store.globalProfile.basic_info.data.photo = tinyPng;
  environment.resetStore(store);
  await openEditor();

  const editorRemove = '#editor-left-panel [data-photo-action="remove"]';
  assert.equal(await page.$eval(editorRemove, button => button.hasAttribute('onclick')), false);
  await page.click(editorRemove);
  await page.waitForFunction(() => {
    const photo = window.editState?.resume?.modules?.basic_info?.data?.photo;
    return photo === '' && !document.querySelector('#editor-left-panel [data-photo-action="remove"]');
  });

  const uploadButton = '#editor-left-panel [data-photo-action="upload"]';
  const chooserPromise = page.waitForFileChooser();
  await page.click(uploadButton);
  const chooser = await chooserPromise;
  await chooser.cancel();

  await page.click('[data-click-action="saveCurrentResume"]');
  await environment.waitForStore(
    persisted => persisted.resumes[0]?.modules?.basic_info?.data?.photo === '',
    { message: '简历照片移除结果没有持久化' }
  );
  await page.click('.nav-link[data-route="profile"]');
  await page.waitForSelector('#view-profile.active');
  const profileRemove = '#profile-editor-left [data-photo-action="remove"]';
  await page.waitForSelector(profileRemove);
  assert.equal(await page.$eval(profileRemove, button => button.hasAttribute('onclick')), false);
  await page.evaluate(selector => document.querySelector(selector)?.click(), profileRemove);
  await page.waitForFunction(() => {
    const photo = window.profileEditData?.basic_info?.data?.photo;
    return photo === '' && window.profileDirty === true;
  });
  assertNoPageErrors();
});

test('简历模块可以链接和取消链接全局档案，并保留同步后的本地副本', async () => {
  await openEditor();
  const checkbox = '.global-link-checkbox[data-module="basic_info"]';

  assert.equal(await page.$eval(checkbox, input => input.hasAttribute('onchange')), false);
  await page.click(checkbox);
  await page.waitForSelector('.modal-overlay');
  await page.click('.modal-actions button:last-child');
  await page.waitForFunction(() => {
    const module = window.editState?.resume?.modules?.basic_info;
    return module?.is_global_linked === true && module?.data?.name === '全局档案用户';
  });
  assert.match(await page.$eval('#a4-preview', element => element.textContent), /全局档案用户/);

  await page.click('[data-click-action="saveCurrentResume"]');
  await environment.waitForStore(
    store => store.resumes[0]?.modules?.basic_info?.is_global_linked === true,
    { message: '全局档案链接状态没有持久化' }
  );

  await page.click(checkbox);
  await page.waitForFunction(() => {
    const module = window.editState?.resume?.modules?.basic_info;
    return module?.is_global_linked === false && module?.data?.name === '全局档案用户';
  });
  await page.click('[data-click-action="saveCurrentResume"]');
  const persisted = await environment.waitForStore(
    store => {
      const module = store.resumes[0]?.modules?.basic_info;
      return module?.is_global_linked === false && module?.data?.name === '全局档案用户';
    },
    { message: '取消链接后的本地副本没有持久化' }
  );
  assert.equal(persisted.resumes[0].modules.basic_info.data.name, '全局档案用户');
  assertNoPageErrors();
});
