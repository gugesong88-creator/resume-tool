const { createNewResumeData } = require('../../src/schema');

function createFixtureStore() {
  const resume = createNewResumeData('端到端测试简历', () => 'e2e-resume');
  resume.modules.basic_info.data.name = '测试用户';
  resume.modules.internship.items.push(
    {
      title: '甲方示例公司',
      role: '产品实习生',
      time: '2026.01—2026.03',
      bullets: ['完成结构化简历工具回归测试。']
    },
    {
      title: '乙方示例公司',
      role: '研发实习生',
      time: '2026.04—2026.06',
      bullets: ['补齐编辑器关键流程测试。']
    }
  );

  return {
    resumes: [resume],
    deliveryRecords: [{
      id: 'e2e-delivery',
      resumeId: resume.id,
      resumeName: resume.name,
      company: '示例科技',
      position: '产品实习生',
      email: 'hr@example.com',
      date: '2026-08-23',
      status: '已投递',
      notes: '端到端测试记录',
      createdAt: '2026-08-23T00:00:00.000Z'
    }],
    globalProfile: {
      basic_info: {
        id: 'basic_info',
        title: '个人信息',
        visible: true,
        deletable: false,
        order: 1,
        sidebar: false,
        data: { name: '全局档案用户', photo: '' },
        items: [
          { label: '电话', value: '13800000000' },
          { label: '邮箱', value: 'global@example.com' }
        ]
      },
      education: {
        id: 'education',
        title: '教育经历',
        visible: true,
        deletable: true,
        order: 2,
        sidebar: true,
        items: [{
          school: '全局测试大学',
          major: '软件工程',
          time: '2022.09—2026.06',
          bullets: ['GPA 3.8/4.0']
        }]
      },
      custom: {
        id: 'custom',
        title: '其他',
        visible: true,
        deletable: true,
        order: 5,
        sidebar: false,
        items: [{ bullets: ['英语 CET-6'] }]
      }
    },
    settings: {}
  };
}

module.exports = { createFixtureStore };
