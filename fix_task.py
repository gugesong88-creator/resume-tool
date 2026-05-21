import sys

with open('/Users/smr/.gemini/antigravity/brain/e4fd8faa-dec1-4795-a7da-37f7f2798870/task.md', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(len(lines)):
    if "### Phase 1h：编辑器面板合并" in lines[i]:
        # replace the checkmarks for the 4 subtasks
        for j in range(i+1, min(i+10, len(lines))):
            if lines[j].startswith("- [ ] "):
                lines[j] = lines[j].replace("- [ ] ", "- [x] ")

with open('/Users/smr/.gemini/antigravity/brain/e4fd8faa-dec1-4795-a7da-37f7f2798870/task.md', 'w', encoding='utf-8') as f:
    f.writelines(lines)

