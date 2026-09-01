const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadTemplateRuntime() {
  const window = {
    escHtml(value) {
      return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }
  };
  const context = vm.createContext({ window });

  for (const relativePath of ['src/templates/t01-classic-dense.js', 'src/templates/index.js']) {
    const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
    vm.runInContext(source, context, { filename: relativePath });
  }

  return window;
}

test('个人信息仅显示值，并使用全角竖线紧凑分隔', () => {
  const runtime = loadTemplateRuntime();
  const template = runtime.getTemplate('T01_classic_dense');
  const html = runtime.renderResumeHTML(template, {
    basic_info: {
      id: 'basic_info',
      visible: true,
      order: 1,
      data: { name: '测试用户', photo: '' },
      items: [
        { label: '电话', value: '13800000000' },
        { label: '邮箱', value: 'test@example.com' },
        { label: '毕业时间', value: '2027.6' }
      ]
    }
  }, {});
  const visibleText = html.replace(/<[^>]+>/g, '').replace(/\s+/g, '');

  assert.match(visibleText, /13800000000｜test@example\.com｜2027\.6/);
  assert.doesNotMatch(visibleText, /电话：|邮箱：|毕业时间：/);
  assert.equal((html.match(/class="contact-separator"/g) || []).length, 2);
  assert.match(html, /data-editable="basic_info\.items\.0\.value"/);
  assert.match(html, /aria-label="电话"/);
});

test('空的个人信息会显示可识别的编辑提示', () => {
  const runtime = loadTemplateRuntime();
  const template = runtime.getTemplate('T01_classic_dense');
  const html = runtime.renderResumeHTML(template, {
    basic_info: {
      id: 'basic_info',
      visible: true,
      order: 1,
      data: { name: '测试用户', photo: '' },
      items: [{ label: '微信', value: '' }]
    }
  }, {});

  assert.match(html, />点击填写微信</);
});
