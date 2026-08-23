const test = require('node:test');
const assert = require('node:assert/strict');
const {
  SCHEMA_VERSION,
  CLASSIC_TEMPLATE_ID,
  createNewResumeData,
  normalizeStore,
  validateStore
} = require('../src/schema');

test('normalizes legacy resumes without mutating the input', () => {
  const legacy = {
    resumes: [{
      id: 'legacy-1',
      name: '旧简历',
      template_id: 'T02_modern_icon',
      modules: {
        basic_info: {
          id: 'basic_info',
          data: { name: '测试用户', phone: '13800000000', email: 'test@example.com' }
        },
        legacy_custom: { id: 'legacy_custom', title: '保留模块', items: [{ value: '保留内容' }] }
      }
    }],
    deliveryRecords: [],
    settings: {}
  };
  const snapshot = JSON.stringify(legacy);

  const migrated = normalizeStore(legacy);
  const resume = migrated.resumes[0];

  assert.equal(JSON.stringify(legacy), snapshot);
  assert.equal(migrated.schema_version, SCHEMA_VERSION);
  assert.equal(resume.schema_version, SCHEMA_VERSION);
  assert.equal(resume.template_id, CLASSIC_TEMPLATE_ID);
  assert.deepEqual(
    resume.modules.basic_info.items.map(item => item.label),
    ['电话', '邮箱']
  );
  assert.equal(resume.modules.legacy_custom.items[0].value, '保留内容');
  assert.equal(validateStore(migrated).success, true);
});

test('merges nested and module-level basic information items once', () => {
  const migrated = normalizeStore({
    resumes: [{
      id: 'mixed-1',
      modules: {
        basic_info: {
          data: {
            name: '测试用户',
            phone: '13800000000',
            items: [{ label: '邮箱', value: 'test@example.com' }]
          },
          items: [{ label: '电话', value: '' }]
        }
      }
    }],
    deliveryRecords: [],
    settings: {}
  });

  const items = migrated.resumes[0].modules.basic_info.items;
  assert.equal(items.filter(item => item.label === '电话').length, 1);
  assert.equal(items.find(item => item.label === '电话').value, '13800000000');
  assert.equal(items.find(item => item.label === '邮箱').value, 'test@example.com');
});

test('new resumes use schema v3 and the classic template', () => {
  const resume = createNewResumeData('新简历', () => 'new-id');
  assert.equal(resume.schema_version, SCHEMA_VERSION);
  assert.equal(resume.template_id, CLASSIC_TEMPLATE_ID);
  assert.equal(resume.modules.basic_info.items.length, 4);
});
