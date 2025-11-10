@echo off
chcp 65001 >nul
echo ========================================
echo   Electron TodoList 一键安装和运行
echo ========================================
echo.

REM 检查 Node.js 是否安装
echo [1/4] 检查 Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js 未安装！
    echo.
    echo 请先安装 Node.js：
    echo 1. 访问 https://nodejs.org/
    echo 2. 下载 LTS 版本
    echo 3. 安装后重新运行此脚本
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js 已安装
node --version
echo.

REM 检查 npm 是否可用
echo [2/4] 检查 npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm 不可用！
    echo.
    echo 请检查 Node.js 安装是否正确。
    pause
    exit /b 1
)

echo ✅ npm 已安装
npm --version
echo.

REM 检查 node_modules 是否存在
if exist "node_modules\" (
    echo [3/4] 依赖已安装，跳过安装步骤
    echo.
) else (
    echo [3/4] 安装项目依赖...
    echo 这可能需要几分钟，请耐心等待...
    echo.
    
    REM 设置国内镜像源（可选，提高下载速度）
    echo 配置镜像源...
    call npm config set registry https://registry.npmmirror.com
    call npm config set electron_mirror https://npmmirror.com/mirrors/electron/
    echo.
    
    echo 开始安装...
    call npm install
    
    if %errorlevel% neq 0 (
        echo.
        echo ❌ 依赖安装失败！
        echo.
        echo 可能的解决方案：
        echo 1. 检查网络连接
        echo 2. 以管理员身份运行此脚本
        echo 3. 删除 node_modules 文件夹后重试
        echo.
        pause
        exit /b 1
    )
    
    echo.
    echo ✅ 依赖安装成功！
    echo.
)

REM 启动应用
echo [4/4] 启动应用...
echo.
echo 应用即将启动，请稍候...
echo （窗口会在 2-3 秒内出现）
echo.
echo 使用提示：
echo - 输入框中输入待办，按 Enter 添加
echo - 双击待办项可以编辑
echo - 悬停显示删除按钮
echo.
echo ========================================
echo.

call npm start

echo.
echo ========================================
echo   应用已关闭
echo ========================================
echo.
pause


