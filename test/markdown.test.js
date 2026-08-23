const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

test('exports the canonical module schema as Markdown', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/modules/export.js'), 'utf8');
  const sandbox = { window: {}, Blob: class {}, URL: {} };
  vm.runInNewContext(source, sandbox, { filename: 'src/modules/export.js' });

  const markdown = sandbox.window.resumeToMarkdown({
    name: '投递版本',
    modules: {
      basic_info: {
        id: 'basic_info',
        data: { name: '<b>测试用户</b>' },
        items: [{ label: '邮箱', value: 'test@example.com' }]
      },
      internship: {
        id: 'internship',
        title: '实习经历',
        visible: true,
        order: 2,
        items: [{
          title: '示例公司',
          role: '产品实习生',
          time: '2026.01—2026.03',
          bullets: ['<strong>结果：</strong>完成回归测试。']
        }]
      }
    }
  });

  assert.match(markdown, /^# 测试用户/m);
  assert.match(markdown, /邮箱：test@example.com/);
  assert.match(markdown, /## 实习经历/);
  assert.match(markdown, /### 示例公司/);
  assert.match(markdown, /- 结果：完成回归测试。/);
});
