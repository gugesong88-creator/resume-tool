import sys

with open('resume_chatgpt_stable_clean_v9.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for i, l in enumerate(lines):
    if "window.historyStack = [];" in l:
        new_lines.append("""
        // Migrate basic_info fixed fields to dynamic items
        if (editState && editState.resume && editState.resume.modules && editState.resume.modules.basic_info) {
            let bi = editState.resume.modules.basic_info;
            if (bi.data && !bi.items) {
                bi.items = [];
                const mapping = [
                    { key: 'intention', label: '求职意向' },
                    { key: 'phone', label: '电话' },
                    { key: 'email', label: '邮箱' },
                    { key: 'gender', label: '性别' },
                    { key: 'age', label: '年龄' },
                    { key: 'political_status', label: '政治面貌' },
                    { key: 'graduation', label: '毕业时间' },
                    { key: 'availability', label: '到岗时间' },
                    { key: 'city', label: '城市' },
                    { key: 'wechat', label: '微信' },
                    { key: 'linkedin', label: '个人网站' },
                    { key: 'github', label: 'GitHub' }
                ];
                mapping.forEach(m => {
                    if (bi.data[m.key]) {
                        bi.items.push({ label: m.label, value: bi.data[m.key] });
                        delete bi.data[m.key];
                    }
                });
            }
        }
""")
    new_lines.append(l)

with open('resume_chatgpt_stable_clean_v9.html', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
