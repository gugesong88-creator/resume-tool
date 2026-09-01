import os
import zipfile

def package():
    zip_name = "resume_tool_share.zip"
    print(f"开始打包简历工具...")

    # 需要包含的文件和文件夹
    include_paths = [
        "src",
        "lib",
        "assets",
        "package.json",
        "resume_chatgpt_stable_clean_v9.html",
        "server.js",
        "启动简历工具.bat",
        "启动简历工具.command",
        "README.md",
        "CLAUDE.md",
        "LESSONS.md"
    ]

    if os.path.exists(zip_name):
        try:
            os.remove(zip_name)
            print(f"已删除旧的 {zip_name}")
        except Exception as e:
            print(f"无法删除旧的 {zip_name}: {e}")
            return

    count = 0
    with zipfile.ZipFile(zip_name, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for path in include_paths:
            if not os.path.exists(path):
                print(f"提示: 未找到路径 {path}，已跳过")
                continue

            if os.path.isdir(path):
                for root, dirs, files in os.walk(path):
                    for file in files:
                        file_path = os.path.join(root, file)
                        # 排除 Mac 的 .DS_Store 文件
                        if ".DS_Store" in file_path:
                            continue
                        zipf.write(file_path, file_path)
                        count += 1
            else:
                zipf.write(path, path)
                count += 1

        # 在压缩包中创建空的 data/ 结构，供系统运行后自动创建数据库
        zipf.writestr("data/", "")
        zipf.writestr("data/images/", "")

    print("=========================================")
    print(f" 打包成功！共写入 {count} 个文件")
    print(f" 生成文件: {os.path.abspath(zip_name)}")
    print("=========================================")
    print("【使用提示】")
    print("1. 这个压缩包是一个干净的版本，不包含您自己的简历数据（隐私安全）。")
    print("2. 如果您希望把您的简历数据也发给朋友参考，可以在打包后单独把 data/ 文件夹发给她。")
    print("3. 直接把生成的 resume_tool_share.zip 发给您的 Windows 朋友即可。")

if __name__ == "__main__":
    package()
