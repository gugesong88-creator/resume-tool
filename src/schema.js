// src/schema.js

const SCHEMA_VERSION = '2.0';

function createBasicInfoModule() {
  return {
    id: 'basic_info', title: '个人信息', visible: true, deletable: false, order: 1,
    sidebar: false,
    data: { name: '', phone: '', email: '', city: '', intention: '', age: '', wechat: '', linkedin: '', github: '', political_status: '', availability: '', graduation: '' }
  };
}

function createModule(id, title, order, sidebar = false) {
  return {
    id, title, visible: true, deletable: true, order, sidebar, items: []
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
    id: generateIdFn ? generateIdFn() : ('res_' + Date.now().toString(36)),
    name: name || '未命名简历',
    template_id: 'T01_classic_dense',
    meta: { target_company: '', target_position: '', jd_text: '', note: '' },
    modules: getDefaultModules(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

// 挂载到 window，保证当前兼容性，等完全模块化后再移除
window.getDefaultModules = getDefaultModules;
window.createNewResumeData = createNewResumeData;
window.createEducationItem = createEducationItem;
window.createExperienceItem = createExperienceItem;
