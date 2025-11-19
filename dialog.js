// 自定义弹窗系统
// 替代原生 alert() 和 confirm()，支持主题切换

/**
 * 显示警告/信息弹窗（替代 alert）
 * @param {string} message - 要显示的消息
 * @param {object} options - 配置选项
 * @param {string} options.title - 弹窗标题，默认为"提示"
 * @param {string} options.type - 弹窗类型：'info' | 'warning' | 'error' | 'success'，默认为 'info'
 * @param {string} options.confirmText - 确认按钮文本，默认为"确定"
 * @returns {Promise<void>}
 */
async function showAlert(message, options = {}) {
  return new Promise((resolve) => {
    const {
      title = '提示',
      type = 'info',
      confirmText = '确定'
    } = options;

    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.style.opacity = '0';
    overlay.style.visibility = 'hidden';

    // 创建弹窗容器
    const dialog = document.createElement('div');
    dialog.className = 'custom-dialog';
    dialog.style.opacity = '0';
    dialog.style.transform = 'scale(0.9) translateY(-10px)';

    // 创建图标
    const iconMap = {
      info: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>`,
      warning: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>`,
      error: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>`,
      success: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>`
    };

    // 构建弹窗内容
    dialog.innerHTML = `
      <div class="dialog-content">
        <div class="dialog-icon dialog-icon-${type}">
          ${iconMap[type] || iconMap.info}
        </div>
        <div class="dialog-body">
          <h3 class="dialog-title">${title}</h3>
          <p class="dialog-message">${message}</p>
        </div>
        <div class="dialog-actions">
          <button class="dialog-btn dialog-btn-primary" data-action="confirm">${confirmText}</button>
        </div>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // 动画显示
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      overlay.style.visibility = 'visible';
      dialog.style.opacity = '1';
      dialog.style.transform = 'scale(1) translateY(0)';
    });

    // 确认按钮点击事件
    const confirmBtn = dialog.querySelector('[data-action="confirm"]');
    const handleConfirm = () => {
      // 动画隐藏
      overlay.style.opacity = '0';
      dialog.style.opacity = '0';
      dialog.style.transform = 'scale(0.9) translateY(-10px)';
      
      setTimeout(() => {
        document.body.removeChild(overlay);
        resolve();
      }, 200);
    };

    confirmBtn.addEventListener('click', handleConfirm);
    
    // 点击遮罩层关闭（可选）
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        handleConfirm();
      }
    });

    // ESC 键关闭
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        handleConfirm();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
  });
}

/**
 * 显示确认弹窗（替代 confirm）
 * @param {string} message - 要显示的消息
 * @param {object} options - 配置选项
 * @param {string} options.title - 弹窗标题，默认为"确认"
 * @param {string} options.type - 弹窗类型：'info' | 'warning' | 'error'，默认为 'warning'
 * @param {string} options.confirmText - 确认按钮文本，默认为"确定"
 * @param {string} options.cancelText - 取消按钮文本，默认为"取消"
 * @returns {Promise<boolean>} 返回 true 表示确认，false 表示取消
 */
async function showConfirm(message, options = {}) {
  return new Promise((resolve) => {
    const {
      title = '确认',
      type = 'warning',
      confirmText = '确定',
      cancelText = '取消'
    } = options;

    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.style.opacity = '0';
    overlay.style.visibility = 'hidden';

    // 创建弹窗容器
    const dialog = document.createElement('div');
    dialog.className = 'custom-dialog';
    dialog.style.opacity = '0';
    dialog.style.transform = 'scale(0.9) translateY(-10px)';

    // 创建图标
    const iconMap = {
      info: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>`,
      warning: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>`,
      error: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>`
    };

    // 构建弹窗内容
    dialog.innerHTML = `
      <div class="dialog-content">
        <div class="dialog-icon dialog-icon-${type}">
          ${iconMap[type] || iconMap.warning}
        </div>
        <div class="dialog-body">
          <h3 class="dialog-title">${title}</h3>
          <p class="dialog-message">${message}</p>
        </div>
        <div class="dialog-actions">
          <button class="dialog-btn dialog-btn-secondary" data-action="cancel">${cancelText}</button>
          <button class="dialog-btn dialog-btn-primary" data-action="confirm">${confirmText}</button>
        </div>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // 动画显示
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      overlay.style.visibility = 'visible';
      dialog.style.opacity = '1';
      dialog.style.transform = 'scale(1) translateY(0)';
    });

    // 按钮点击事件处理
    const handleAction = (action) => {
      // 动画隐藏
      overlay.style.opacity = '0';
      dialog.style.opacity = '0';
      dialog.style.transform = 'scale(0.9) translateY(-10px)';
      
      setTimeout(() => {
        document.body.removeChild(overlay);
        resolve(action === 'confirm');
      }, 200);
    };

    const confirmBtn = dialog.querySelector('[data-action="confirm"]');
    const cancelBtn = dialog.querySelector('[data-action="cancel"]');
    
    confirmBtn.addEventListener('click', () => handleAction('confirm'));
    cancelBtn.addEventListener('click', () => handleAction('cancel'));

    // 点击遮罩层取消
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        handleAction('cancel');
      }
    });

    // ESC 键取消
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        handleAction('cancel');
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
  });
}

// 导出函数（如果使用模块系统）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { showAlert, showConfirm };
}

