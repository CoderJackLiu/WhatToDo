/**
 * 图标生成脚本
 * 使用 sharp 库生成 TodoList 应用图标
 * 
 * 安装依赖: npm install sharp --save-dev
 * 运行: node build/generate-icon.js
 */

const sharp = require('sharp');
const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Windows 图标尺寸列表
const winSizes = [16, 32, 48, 64, 128, 256];
// Mac 图标尺寸列表（需要更多尺寸）
const macSizes = [16, 32, 64, 128, 256, 512, 1024];

// 创建 SVG 图标（紫色渐变 + 待办清单图标）
function createIconSVG(size) {
  const center = size / 2;
  const padding = size * 0.15;
  const iconSize = size - padding * 2;
  
  return `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- 背景圆角矩形 -->
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
  
  <!-- 待办清单图标 -->
  <g transform="translate(${center}, ${center})">
    <!-- 纸张背景 -->
    <rect x="${-iconSize * 0.35}" y="${-iconSize * 0.4}" 
          width="${iconSize * 0.7}" height="${iconSize * 0.8}" 
          rx="${size * 0.05}" fill="rgba(255,255,255,0.95)"/>
    
    <!-- 待办项线条 -->
    <line x1="${-iconSize * 0.25}" y1="${-iconSize * 0.2}" 
          x2="${iconSize * 0.15}" y2="${-iconSize * 0.2}" 
          stroke="#667eea" stroke-width="${size * 0.02}" stroke-linecap="round"/>
    
    <line x1="${-iconSize * 0.25}" y1="0" 
          x2="${iconSize * 0.15}" y2="0" 
          stroke="#667eea" stroke-width="${size * 0.02}" stroke-linecap="round"/>
    
    <line x1="${-iconSize * 0.25}" y1="${iconSize * 0.2}" 
          x2="${iconSize * 0.15}" y2="${iconSize * 0.2}" 
          stroke="#667eea" stroke-width="${size * 0.02}" stroke-linecap="round"/>
    
    <!-- 复选框 -->
    <circle cx="${-iconSize * 0.3}" cy="${-iconSize * 0.2}" 
            r="${size * 0.04}" fill="none" stroke="#667eea" 
            stroke-width="${size * 0.015}"/>
    
    <!-- 已完成标记 -->
    <path d="M ${-iconSize * 0.32} ${-iconSize * 0.2} L ${-iconSize * 0.3} ${-iconSize * 0.18} L ${-iconSize * 0.28} ${-iconSize * 0.2}" 
          stroke="#667eea" stroke-width="${size * 0.015}" 
          stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>
</svg>`;
}

async function generateIcons() {
  console.log('开始生成图标...');
  
  // 确保输出目录存在
  const outputDir = path.join(__dirname);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 生成各个尺寸的 PNG 图标（Windows）
  const pngFiles = [];
  for (const size of winSizes) {
    const svg = createIconSVG(size);
    const pngPath = path.join(outputDir, `icon-${size}.png`);
    
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(pngPath);
    
    console.log(`✓ 生成 ${size}x${size} PNG 图标`);
    pngFiles.push(pngPath);
  }
  
  // 生成 Mac 需要的额外尺寸
  const macPngFiles = [];
  for (const size of macSizes) {
    if (!winSizes.includes(size)) {
      const svg = createIconSVG(size);
      const pngPath = path.join(outputDir, `icon-${size}.png`);
      
      await sharp(Buffer.from(svg))
        .resize(size, size)
        .png()
        .toFile(pngPath);
      
      console.log(`✓ 生成 ${size}x${size} PNG 图标 (Mac)`);
      macPngFiles.push(pngPath);
    }
  }
  
  // 生成 ICO 文件（Windows 需要）
  console.log('\n正在生成 ICO 文件...');
  try {
    const icoBuffers = await Promise.all(
      winSizes.map(size => {
        const pngPath = path.join(outputDir, `icon-${size}.png`);
        return fs.promises.readFile(pngPath);
      })
    );
    
    const icoBuffer = await toIco(icoBuffers);
    const icoPath = path.join(outputDir, 'icon.ico');
    fs.writeFileSync(icoPath, icoBuffer);
    console.log(`✓ 生成 icon.ico 文件`);
  } catch (error) {
    console.error('生成 ICO 文件失败:', error.message);
    console.log('提示: 可以手动使用在线工具将 icon-256.png 转换为 icon.ico');
  }
  
  // 生成 ICNS 文件（Mac 需要）
  console.log('\n正在生成 ICNS 文件...');
  try {
    await generateIcns(outputDir);
    console.log(`✓ 生成 icon.icns 文件`);
  } catch (error) {
    console.warn('生成 ICNS 文件失败:', error.message);
    console.log('提示: ICNS 文件需要在 macOS 上使用 iconutil 命令生成');
    console.log('或者使用在线工具将 PNG 文件转换为 ICNS');
  }
  
  console.log('\n✓ 所有图标生成完成！');
  
  return pngFiles;
}

// 生成 ICNS 文件（仅在 macOS 上可用）
async function generateIcns(outputDir) {
  if (process.platform !== 'darwin') {
    throw new Error('ICNS 文件只能在 macOS 上生成');
  }
  
  // 创建 iconset 目录
  const iconsetDir = path.join(outputDir, 'icon.iconset');
  if (fs.existsSync(iconsetDir)) {
    fs.rmSync(iconsetDir, { recursive: true });
  }
  fs.mkdirSync(iconsetDir, { recursive: true });
  
  // Mac 需要的图标尺寸和命名规则
  const iconSizes = [
    { size: 16, name: 'icon_16x16.png' },
    { size: 32, name: 'icon_16x16@2x.png' },
    { size: 32, name: 'icon_32x32.png' },
    { size: 64, name: 'icon_32x32@2x.png' },
    { size: 128, name: 'icon_128x128.png' },
    { size: 256, name: 'icon_128x128@2x.png' },
    { size: 256, name: 'icon_256x256.png' },
    { size: 512, name: 'icon_256x256@2x.png' },
    { size: 512, name: 'icon_512x512.png' },
    { size: 1024, name: 'icon_512x512@2x.png' }
  ];
  
  // 复制或生成所需尺寸的图标
  for (const { size, name } of iconSizes) {
    const sourcePath = path.join(outputDir, `icon-${size}.png`);
    const targetPath = path.join(iconsetDir, name);
    
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, targetPath);
    } else {
      // 如果不存在，从最接近的尺寸生成
      const closestSize = macSizes.find(s => s >= size) || macSizes[macSizes.length - 1];
      const closestPath = path.join(outputDir, `icon-${closestSize}.png`);
      if (fs.existsSync(closestPath)) {
        await sharp(closestPath)
          .resize(size, size)
          .png()
          .toFile(targetPath);
      }
    }
  }
  
  // 使用 iconutil 生成 ICNS
  const icnsPath = path.join(outputDir, 'icon.icns');
  execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`, { stdio: 'inherit' });
  
  // 清理 iconset 目录
  fs.rmSync(iconsetDir, { recursive: true });
}

// 运行
if (require.main === module) {
  generateIcons().catch(console.error);
}

module.exports = { generateIcons, createIconSVG };

