#!/bin/zsh

set -u

launcher_path="$0"
while [[ -L "$launcher_path" ]]; do
  launcher_dir="$(cd -P "$(dirname "$launcher_path")" >/dev/null 2>&1 && pwd)"
  launcher_path="$(readlink "$launcher_path")"
  [[ "$launcher_path" != /* ]] && launcher_path="$launcher_dir/$launcher_path"
done

project_dir="$(cd -P "$(dirname "$launcher_path")/.." >/dev/null 2>&1 && pwd)"

clear
echo "正在启动简历制作工具…"
echo "项目目录：$project_dir"
echo "启动后可在此窗口按 Ctrl+C 停止服务。"
echo

if ! command -v npm >/dev/null 2>&1; then
  echo "未找到 npm。请先安装 Node.js 22.12 或更高版本。"
  echo
  read "launcher_reply?按回车键关闭窗口…"
  exit 1
fi

cd "$project_dir" || exit 1
npm start
launcher_status=$?

if [[ $launcher_status -ne 0 ]]; then
  echo
  echo "启动失败，退出代码：$launcher_status"
  read "launcher_reply?按回车键关闭窗口…"
fi

exit $launcher_status
