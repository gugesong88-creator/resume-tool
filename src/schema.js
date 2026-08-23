// Versioned resume data contract shared by the browser and the local Node server.
(function initResumeSchema(root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (root && root.window === root) {
    root.ResumeSchema = api;
    root.getDefaultModules = api.getDefaultModules;
    root.createNewResumeData = api.createNewResumeData;
    root.createEducationItem = api.createEducationItem;
    root.createExperienceItem = api.createExperienceItem;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createResumeSchema() {
  'use strict';

  const SCHEMA_VERSION = 3;
  const CLASSIC_TEMPLATE_ID = 'T01_classic_dense';

  const LEGACY_BASIC_INFO_FIELDS = [
    ['intention', '求职意向'],
    ['phone', '电话'],
    ['email', '邮箱'],
    ['gender', '性别'],
    ['age', '年龄'],
    ['political_status', '政治面貌'],
    ['graduation', '毕业时间'],
    ['availability', '到岗时间'],
    ['city', '城市'],
    ['wechat', '微信'],
    ['linkedin', '个人网站'],
    ['github', 'GitHub']
  ];

  const DEFAULT_BASIC_INFO_ITEMS = [
    { label: '电话', value: '' },
    { label: '邮箱', value: '' },
    { label: '微信', value: '' },
    { label: 'GitHub', value: '' }
  ];

  function isObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function createBasicInfoModule() {
    return {
      id: 'basic_info',
      title: '个人信息',
      visible: true,
      deletable: false,
      order: 1,
      sidebar: false,
      data: { name: '', photo: '' },
      items: clone(DEFAULT_BASIC_INFO_ITEMS)
    };
  }

  function createModule(id, title, order, sidebar = false) {
    return {
      id,
      title,
      visible: true,
      deletable: true,
      order,
      sidebar,
      items: []
    };
  }

  function getDefaultModules() {
    return {
      basic_info: createBasicInfoModule(),
      education: createModule('education', '教育经历', 2, true),
      internship: createModule('internship', '实习经历', 3, false),
      project: createModule('project', '项目经历', 4, false),
      custom: { ...createModule('custom', '其他', 5, false), visible: false }
    };
  }

  function createEducationItem() {
    return { school: '', major: '', time: '', bullets: [''] };
  }

  function createExperienceItem() {
    return { title: '', role: '', time: '', bullets: [''] };
  }

  function createNewResumeData(name, generateIdFn) {
    return {
      schema_version: SCHEMA_VERSION,
      id: generateIdFn ? generateIdFn() : `res_${Date.now().toString(36)}`,
      name: name || '未命名简历',
      template_id: CLASSIC_TEMPLATE_ID,
      meta: { target_company: '', target_position: '', jd_text: '', note: '' },
      modules: getDefaultModules(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  function addLegacyBasicInfo(items, label, value) {
    if (value === undefined || value === null || String(value).trim() === '') return;

    const existingByLabel = items.find(item => isObject(item) && item.label === label);
    if (existingByLabel) {
      if (!existingByLabel.value) existingByLabel.value = value;
      return;
    }

    const alreadyPresent = items.some(item => isObject(item) && item.value === value);
    if (!alreadyPresent) items.push({ label, value });
  }

  function normalizeBasicInfoModule(input, options = {}) {
    const fallback = createBasicInfoModule();
    const source = isObject(input) ? clone(input) : {};
    const data = isObject(source.data) ? source.data : {};
    const items = [];

    if (Array.isArray(source.items)) items.push(...clone(source.items));
    if (Array.isArray(data.items)) items.push(...clone(data.items));

    for (const [field, label] of LEGACY_BASIC_INFO_FIELDS) {
      addLegacyBasicInfo(items, label, data[field]);
      delete data[field];
    }
    delete data.items;

    if (options.seedDefaults && items.length === 0) {
      items.push(...clone(DEFAULT_BASIC_INFO_ITEMS));
    }

    return {
      ...fallback,
      ...source,
      id: 'basic_info',
      data,
      items
    };
  }

  function normalizeModule(input, fallback) {
    const source = isObject(input) ? clone(input) : {};
    return {
      ...clone(fallback),
      ...source,
      id: source.id || fallback.id,
      items: Array.isArray(source.items) ? source.items : []
    };
  }

  function normalizeModules(input) {
    const source = isObject(input) ? input : {};
    const defaults = getDefaultModules();
    const modules = {};

    modules.basic_info = normalizeBasicInfoModule(source.basic_info, {
      seedDefaults: !isObject(source.basic_info)
    });

    for (const [id, fallback] of Object.entries(defaults)) {
      if (id === 'basic_info') continue;
      modules[id] = normalizeModule(source[id], fallback);
    }

    // Preserve unknown/custom modules so a migration never deletes user data.
    for (const [id, moduleValue] of Object.entries(source)) {
      if (!Object.prototype.hasOwnProperty.call(modules, id)) {
        modules[id] = clone(moduleValue);
      }
    }

    return modules;
  }

  function normalizeResume(input, index = 0) {
    const source = isObject(input) ? clone(input) : {};
    const now = new Date().toISOString();
    return {
      ...source,
      schema_version: SCHEMA_VERSION,
      id: source.id || `res_migrated_${index + 1}`,
      name: source.name || '未命名简历',
      template_id: CLASSIC_TEMPLATE_ID,
      meta: isObject(source.meta) ? source.meta : {},
      modules: normalizeModules(source.modules),
      created_at: source.created_at || now,
      updated_at: source.updated_at || now
    };
  }

  function normalizeGlobalProfile(input) {
    if (!isObject(input)) return undefined;
    const source = clone(input);
    const output = { ...source };

    output.basic_info = normalizeBasicInfoModule(source.basic_info, { seedDefaults: true });
    output.education = normalizeModule(
      source.education,
      createModule('education', '教育经历', 2, true)
    );
    output.custom = normalizeModule(
      source.custom,
      { ...createModule('custom', '其他', 5, false), visible: true }
    );

    return output;
  }

  function normalizeStore(input) {
    const source = isObject(input) ? clone(input) : {};
    const output = {
      ...source,
      schema_version: SCHEMA_VERSION,
      resumes: Array.isArray(source.resumes)
        ? source.resumes.map((resume, index) => normalizeResume(resume, index))
        : [],
      deliveryRecords: Array.isArray(source.deliveryRecords) ? source.deliveryRecords : [],
      settings: isObject(source.settings) ? source.settings : {}
    };

    const globalProfile = normalizeGlobalProfile(source.globalProfile);
    if (globalProfile) output.globalProfile = globalProfile;
    else delete output.globalProfile;

    return output;
  }

  function validateStore(input) {
    const errors = [];
    if (!isObject(input)) {
      return { success: false, errors: ['store 必须是对象'] };
    }
    if (!Array.isArray(input.resumes)) errors.push('resumes 必须是数组');
    if (!Array.isArray(input.deliveryRecords)) errors.push('deliveryRecords 必须是数组');

    const ids = new Set();
    for (const [index, resume] of (input.resumes || []).entries()) {
      if (!isObject(resume)) {
        errors.push(`resumes[${index}] 必须是对象`);
        continue;
      }
      if (!resume.id || typeof resume.id !== 'string') errors.push(`resumes[${index}].id 缺失`);
      if (resume.id && ids.has(resume.id)) errors.push(`存在重复简历 id: ${resume.id}`);
      if (resume.id) ids.add(resume.id);
      if (!isObject(resume.modules)) errors.push(`resumes[${index}].modules 必须是对象`);
      if (resume.template_id !== CLASSIC_TEMPLATE_ID) {
        errors.push(`resumes[${index}].template_id 必须为 ${CLASSIC_TEMPLATE_ID}`);
      }
    }

    return { success: errors.length === 0, errors };
  }

  function assertValidStore(input) {
    const result = validateStore(input);
    if (!result.success) throw new Error(`简历数据校验失败: ${result.errors.join('; ')}`);
    return input;
  }

  return {
    SCHEMA_VERSION,
    CLASSIC_TEMPLATE_ID,
    createBasicInfoModule,
    createEducationItem,
    createExperienceItem,
    createNewResumeData,
    getDefaultModules,
    normalizeBasicInfoModule,
    normalizeResume,
    normalizeStore,
    validateStore,
    assertValidStore
  };
});
