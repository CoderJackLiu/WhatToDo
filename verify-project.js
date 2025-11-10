/**
 * 项目完整性验证脚本
 * 运行此脚本检查项目文件是否完整
 * 
 * 使用方法: node verify-project.js
 */

const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

// 必需文件列表
const requiredFiles = {
  '核心代码文件': [
    'package.json',
    'main.js',
    'preload.js',
    'index.html',
    'styles.css',
    'renderer.js'
  ],
  '配置文件': [
    '.gitignore',
    'LICENSE'
  ],
  '文档文件': [
    'README.md',
    'QUICKSTART.md',
    'FEATURES.md',
    'ARCHITECTURE.md',
    'DEVELOPMENT.md',
    'INSTALLATION.md',
    'PROJECT_SUMMARY.md',
    'PROJECT_CHECKLIST.md'
  ]
};

// 检查文件是否存在
function checkFile(filePath) {
  return fs.existsSync(path.join(__dirname, filePath));
}

// 获取文件大小
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(path.join(__dirname, filePath));
    return (stats.size / 1024).toFixed(2) + ' KB';
  } catch (err) {
    return 'N/A';
  }
}

// 主验证函数
function verifyProject() {
  log('\n========================================', 'cyan');
  log('  Electron TodoList 项目完整性检查', 'cyan');
  log('========================================\n', 'cyan');

  let totalFiles = 0;
  let missingFiles = 0;
  let allResults = [];

  // 遍历所有类别
  for (const [category, files] of Object.entries(requiredFiles)) {
    log(`\n【${category}】`, 'blue');
    log('-'.repeat(40), 'blue');

    files.forEach(file => {
      totalFiles++;
      const exists = checkFile(file);
      const size = exists ? getFileSize(file) : 'N/A';
      const status = exists ? '✅' : '❌';
      const color = exists ? 'green' : 'red';

      if (!exists) {
        missingFiles++;
      }

      const result = `${status} ${file.padEnd(25)} ${size}`;
      log(result, color);
      allResults.push({ file, exists, size });
    });
  }

  // 检查 node_modules
  log('\n\n【依赖检查】', 'blue');
  log('-'.repeat(40), 'blue');
  const nodeModulesExists = checkFile('node_modules');
  const nodeModulesStatus = nodeModulesExists ? '✅ 已安装' : '⚠️  未安装';
  const nodeModulesColor = nodeModulesExists ? 'green' : 'yellow';
  log(`${nodeModulesStatus} node_modules`, nodeModulesColor);

  if (!nodeModulesExists) {
    log('   → 请运行: npm install', 'yellow');
  }

  // 总结
  log('\n\n========================================', 'cyan');
  log('  检查结果总结', 'cyan');
  log('========================================\n', 'cyan');

  log(`总文件数:     ${totalFiles}`, 'blue');
  log(`已存在:       ${totalFiles - missingFiles}`, 'green');
  log(`缺失:         ${missingFiles}`, missingFiles > 0 ? 'red' : 'green');
  log(`依赖状态:     ${nodeModulesExists ? '已安装' : '未安装'}`, nodeModulesExists ? 'green' : 'yellow');

  // 计算完整度
  const completeness = ((totalFiles - missingFiles) / totalFiles * 100).toFixed(1);
  log(`\n项目完整度:   ${completeness}%`, completeness === '100.0' ? 'green' : 'yellow');

  // 最终结论
  if (missingFiles === 0 && nodeModulesExists) {
    log('\n✅ 项目完整，所有文件齐全，依赖已安装！', 'green');
    log('   可以运行: npm start', 'green');
  } else if (missingFiles === 0 && !nodeModulesExists) {
    log('\n⚠️  项目文件完整，但依赖未安装', 'yellow');
    log('   请先运行: npm install', 'yellow');
  } else {
    log('\n❌ 项目不完整，缺失部分文件', 'red');
    log('   请检查上述缺失的文件', 'red');
  }

  log('\n========================================\n', 'cyan');

  // 返回状态码
  return missingFiles === 0 ? 0 : 1;
}

// 运行验证
try {
  const exitCode = verifyProject();
  process.exit(exitCode);
} catch (error) {
  log('\n❌ 验证过程出错: ' + error.message, 'red');
  process.exit(1);
}

