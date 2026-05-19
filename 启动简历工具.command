#!/bin/bash
clear
echo "========================================="
echo "  简历制作工具 - 本地服务引擎已激活"
echo "========================================="
echo "工作目录: /Users/smr/claude code/resume tool"
echo "使用说明: 直接在此窗口查看运行状态。不使用时，直接关闭此窗口即可彻底退出工具。"
echo "========================================="

cd "$(dirname "$0")" || { echo "致命错误：未定位到工作目录"; exit 1; }

# 强制释放被挂起的 8000 端口
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

# 调起 Node 本地文件服务与浏览器
node "server.js"
