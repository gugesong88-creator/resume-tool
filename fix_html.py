with open('resume_chatgpt_stable_clean_v9.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

out = []
seen_scripts = set()
for line in lines:
    if '<script src="./src/templates/' in line:
        if line.strip() in seen_scripts:
            continue
        seen_scripts.add(line.strip())
    out.append(line)

with open('resume_chatgpt_stable_clean_v9.html', 'w', encoding='utf-8') as f:
    f.writelines(out)

print("HTML script tags deduplicated.")
