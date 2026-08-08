@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo ╔════════════════════════════════════════════════════════╗
echo ║        ModelRank Git 发布助手 v1.0                     ║
echo ╚════════════════════════════════════════════════════════╝
echo.

REM ========== 读取当前版本号 ==========
echo [初始化] 正在读取当前版本...
for /f "tokens=2 delims=:, " %%a in ('findstr /r "\"version\"" package.json') do (
    set CURRENT_VERSION=%%a
    set CURRENT_VERSION=!CURRENT_VERSION:"=!
)
echo ✓ 当前版本: v!CURRENT_VERSION!
echo.

REM ========== 解析版本号 ==========
for /f "tokens=1,2,3 delims=." %%a in ("!CURRENT_VERSION!") do (
    set MAJOR=%%a
    set MINOR=%%b
    set PATCH=%%c
)

REM ========== 步骤 1: 显示当前状态（中文翻译）==========
echo [步骤 1/7] 检查文件修改状态...
echo ════════════════════════════════════════════════════════
echo.

REM 获取 git status 并翻译
git status --short > temp_status.txt

REM 检查是否有修改
for /f %%i in ("temp_status.txt") do set FILE_SIZE=%%~zi
if !FILE_SIZE! equ 0 (
    echo ✓ 工作区干净，没有需要提交的修改
) else (
    echo 📝 以下文件已修改：
    echo.
    for /f "tokens=1,*" %%a in (temp_status.txt) do (
        set STATUS=%%a
        set FILENAME=%%b
        
        if "!STATUS!"=="M" echo    [已修改] !FILENAME!
        if "!STATUS!"=="A" echo    [新增加] !FILENAME!
        if "!STATUS!"=="D" echo    [已删除] !FILENAME!
        if "!STATUS!"=="??" echo    [未跟踪] !FILENAME!
        if "!STATUS!"=="R" echo    [已重命名] !FILENAME!
    )
)
del temp_status.txt >nul 2>&1
echo.

REM ========== 步骤 2: 询问版本类型 ==========
echo [步骤 2/7] 选择版本更新类型
echo ════════════════════════════════════════════════════════
echo 📌 当前版本: v!CURRENT_VERSION!
echo.

REM 计算新版本号
set /a NEW_MAJOR=!MAJOR!+1
set /a NEW_MINOR=!MINOR!+1
set /a NEW_PATCH=!PATCH!+1

echo 💡 请选择要更新的版本类型：
echo.
echo    1. 大版本 (major)  - v!CURRENT_VERSION! → v!NEW_MAJOR!.0.0
echo       └─ 用于：重大更新、破坏性改动
echo.
echo    2. 中版本 (minor)  - v!CURRENT_VERSION! → v!MAJOR!.!NEW_MINOR!.0
echo       └─ 用于：新功能、新特性（向后兼容）
echo.
echo    3. 小版本 (patch)  - v!CURRENT_VERSION! → v!MAJOR!.!MINOR!.!NEW_PATCH!
echo       └─ 用于：bug修复、小改进
echo.
set /p VERSION_TYPE="👉 请输入选项 (1/2/3): "

if "%VERSION_TYPE%"=="1" (
    set VERSION_NAME=大版本
    set NEW_VERSION=!NEW_MAJOR!.0.0
) else if "%VERSION_TYPE%"=="2" (
    set VERSION_NAME=中版本
    set NEW_VERSION=!MAJOR!.!NEW_MINOR!.0
) else if "%VERSION_TYPE%"=="3" (
    set VERSION_NAME=小版本
    set NEW_VERSION=!MAJOR!.!MINOR!.!NEW_PATCH!
) else (
    echo.
    echo ❌ 错误: 无效的选项！请输入 1、2 或 3
    pause
    exit /b 1
)

echo.
echo ✓ 已选择: %VERSION_NAME% (v!CURRENT_VERSION! → v!NEW_VERSION!)
echo.

REM ========== 步骤 3: 询问 commit 信息 ==========
echo [步骤 3/7] 输入提交说明
echo ════════════════════════════════════════════════════════
echo 📝 请描述本次更新的内容（会显示在版本历史中）
echo.
echo 💡 示例:
echo    - "大幅增加测试覆盖率，添加或修复大量文档"
echo    - "改进设置界面，优化用户体验"
echo    - "修复卫星追踪显示问题"
echo.
set /p COMMIT_MSG="👉 请输入提交说明: "

if "%COMMIT_MSG%"=="" (
    echo.
    echo ❌ 错误: 提交说明不能为空！
    pause
    exit /b 1
)

echo.
echo ✓ 提交说明已记录
echo.

REM ========== 步骤 4: 确认信息 ==========
echo [步骤 4/7] 确认发布信息
echo ════════════════════════════════════════════════════════
echo 📋 请仔细确认以下信息：
echo.
echo    版本类型: %VERSION_NAME%
echo    旧版本号: v!CURRENT_VERSION!
echo    新版本号: v!NEW_VERSION!
echo    提交说明: Release !NEW_VERSION!: %COMMIT_MSG%
echo.
set /p CONFIRM="👉 确认无误并开始发布? (输入 y 继续, 其他键取消): "

if /i not "%CONFIRM%"=="y" (
    echo.
    echo ⚠️  操作已取消，未进行任何修改
    pause
    exit /b 0
)

echo.
echo ✓ 确认完成，开始发布流程...
echo.

REM ========== 步骤 5: 更新 package.json 版本号 ==========
echo [步骤 5/7] 更新项目版本号
echo ════════════════════════════════════════════════════════
echo 📦 正在更新 package.json 文件...

REM 使用 PowerShell 更新 package.json
powershell -Command "(Get-Content package.json) -replace '\"version\": \"!CURRENT_VERSION!\"', '\"version\": \"!NEW_VERSION!\"' | Set-Content package.json"
if errorlevel 1 (
    echo ❌ 错误: 更新 package.json 失败！
    pause
    exit /b 1
)
echo ✓ package.json 已更新: v!CURRENT_VERSION! → v!NEW_VERSION!
echo.

REM ========== 步骤 6: 执行 Git 命令 ==========
echo [步骤 6/7] 提交到 Git 仓库
echo ════════════════════════════════════════════════════════
echo.

echo [6.1] 📦 添加所有修改的文件...
git add .
if errorlevel 1 (
    echo ❌ 错误: 添加文件失败！
    pause
    exit /b 1
)
echo ✓ 文件已添加到暂存区
echo.

echo [6.2] 💾 创建提交记录...
git commit --no-verify -m "Release !NEW_VERSION!: %COMMIT_MSG%"
if errorlevel 1 (
    echo ❌ 错误: 创建提交失败！
    pause
    exit /b 1
)
echo ✓ 提交已创建: Release !NEW_VERSION!
echo.

echo [6.3] 🔄 切换到主分支...
git checkout main
if errorlevel 1 (
    echo ⚠️  警告: 可能已经在 main 分支上
)
echo ✓ 当前在 main 分支
echo.

echo [6.4] ⬇️  从远程拉取最新代码...
git pull origin main
if errorlevel 1 (
    echo ⚠️  警告: 拉取远程代码失败，可能存在冲突
    echo.
    echo 💡 可能的原因:
    echo    1. 远程仓库有新的提交
    echo    2. 存在文件冲突
    echo    3. 网络连接问题
    echo.
    set /p CONTINUE="是否继续推送? (输入 y 继续, 其他键取消): "
    if /i not "!CONTINUE!"=="y" (
        echo ⚠️  操作已取消
        pause
        exit /b 1
    )
) else (
    echo ✓ 远程代码已同步
)
echo.

echo [6.5] 🏷️  创建版本标签...
git tag v!NEW_VERSION!
if errorlevel 1 (
    echo ❌ 错误: 创建标签失败！（标签 v!NEW_VERSION! 可能已存在）
    pause
    exit /b 1
)
echo ✓ 标签已创建: v!NEW_VERSION!
echo.

echo [6.6] ⬆️  推送代码到远程仓库...
git push origin main 2>&1 | findstr /V "Writing objects Enumerating Counting Compressing Delta" 
if errorlevel 1 (
    echo ❌ 错误: 推送代码失败！
    pause
    exit /b 1
)
echo ✓ 代码已推送到 GitHub
echo.

echo [6.7] 🏷️  推送版本标签...
git push origin v!NEW_VERSION! 2>&1 | findstr /V "Writing objects Enumerating Counting Compressing Delta"
if errorlevel 1 (
    echo ❌ 错误: 推送标签失败！
    pause
    exit /b 1
)
echo ✓ 标签已推送到 GitHub
echo.

REM ========== 步骤 7: 完成 ==========
echo ╔════════════════════════════════════════════════════════╗
echo ║                  🎉 发布成功！                         ║
echo ╚════════════════════════════════════════════════════════╝
echo.
echo 📊 发布摘要:
echo    旧版本: v!CURRENT_VERSION!
echo    新版本: v!NEW_VERSION!
echo    提交说明: %COMMIT_MSG%
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo 🌐 后续操作:
echo    1. 访问 GitHub 查看提交记录
echo    2. 创建 Release 发布说明（推荐）
echo.
echo 🔗 GitHub Release 创建链接:
echo    https://github.com/ChenXin-2009/modelrank/releases/new?tag=v!NEW_VERSION!
echo.
echo 💡 提示: 你可以在 Release 页面添加更新日志和下载资源
echo.

pause
