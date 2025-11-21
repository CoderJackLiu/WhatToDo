// DOM 元素
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const errorMessage = document.getElementById('error-message');
const sessionExpiredMessage = document.getElementById('session-expired-message');
const emailConfirmationMessage = document.getElementById('email-confirmation-message');
const resendConfirmationLink = document.getElementById('resend-confirmation-link');
const resendStatus = document.getElementById('resend-status');
const switchToRegister = document.getElementById('switch-to-register');
const switchToLogin = document.getElementById('switch-to-login');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const githubLoginBtn = document.getElementById('github-login-btn');

// 表单输入
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const rememberPassword = document.getElementById('remember-password');
const registerEmail = document.getElementById('register-email');
const registerPassword = document.getElementById('register-password');
const registerPasswordConfirm = document.getElementById('register-password-confirm');

// 当前模式：'login' 或 'register'
let currentMode = 'login';

// 初始化
async function init() {
  await initLanguage();
  bindEvents();
  checkOAuthCallback();
  loadThemeMode();
  listenForSessionExpired();
  loadSavedCredentials();
}

// 监听 session 过期事件
function listenForSessionExpired() {
  if (window.electronAPI && window.electronAPI.onSessionExpired) {
    window.electronAPI.onSessionExpired((data) => {
      showSessionExpired(data);
    });
  }
}

// 显示 session 过期提示
function showSessionExpired(data) {
  if (sessionExpiredMessage) {
    sessionExpiredMessage.style.display = 'block';
    // 隐藏其他提示
    if (errorMessage) errorMessage.style.display = 'none';
    if (emailConfirmationMessage) emailConfirmationMessage.style.display = 'none';
  }
}

// 隐藏 session 过期提示
function hideSessionExpired() {
  if (sessionExpiredMessage) {
    sessionExpiredMessage.style.display = 'none';
  }
}

// 绑定事件
function bindEvents() {
  // 切换表单
  switchToRegister.addEventListener('click', (e) => {
    e.preventDefault();
    switchForm('register');
  });

  switchToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    switchForm('login');
  });

  // 登录
  loginBtn.addEventListener('click', handleLogin);
  loginPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });

  // 记住密码复选框变化事件
  if (rememberPassword) {
    rememberPassword.addEventListener('change', async (e) => {
      // 如果取消勾选，清除已保存的凭据
      if (!e.target.checked) {
        await window.electronAPI.credentials.clear();
      }
    });
  }

  // 注册
  registerBtn.addEventListener('click', handleRegister);
  registerPasswordConfirm.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleRegister();
  });

  // GitHub 登录（界面已注释，保留功能代码）
  // githubLoginBtn.addEventListener('click', handleGitHubLogin);

  // 重新发送确认邮件
  resendConfirmationLink.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = emailConfirmationMessage.getAttribute('data-email');
    if (!email) return;

    resendStatus.style.display = 'block';
    resendStatus.textContent = i18n.t('loading');
    resendStatus.style.color = '#5c4f3a';

    try {
      const result = await window.electronAPI.auth.resendConfirmation(email);
      if (result.success) {
        let successMsg = '✓ ' + i18n.t('login.checkEmail');
        
        // QQ 邮箱特殊提示
        if (email.includes('@qq.com')) {
          successMsg += '\n' + i18n.t('login.qqEmailTip');
        }
        
        resendStatus.textContent = successMsg;
        resendStatus.style.color = '#4caf50';
        
        // 3秒后添加额外提示
        setTimeout(() => {
          if (resendStatus.textContent.includes('✓')) {
            let extraTip = '\n💡 ' + i18n.t('message.info');
            if (email.includes('@qq.com')) {
              extraTip += '\n💡 ' + i18n.t('message.info');
            }
            resendStatus.textContent += extraTip;
          }
        }, 3000);
      } else {
        resendStatus.textContent = '✗ ' + i18n.t('message.error') + ': ' + (result.error || i18n.t('message.unknownError'));
        resendStatus.style.color = '#f44336';
        
        // 如果是频率限制错误，添加提示
        if (result.code === 'rate_limit_exceeded' || result.error?.includes('频率')) {
          setTimeout(() => {
            resendStatus.textContent += '\n⏰ ' + i18n.t('message.info');
          }, 1000);
        }
      }
    } catch (error) {
      console.error('发送邮件异常:', error);
      resendStatus.textContent = '✗ ' + i18n.t('message.error') + ': ' + error.message;
      resendStatus.style.color = '#f44336';
    }
  });
}

// 切换表单
function switchForm(mode) {
  currentMode = mode;
  if (mode === 'login') {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
  }
  hideError();
}

// 显示错误
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
}

// 隐藏错误
function hideError() {
  errorMessage.style.display = 'none';
  emailConfirmationMessage.style.display = 'none';
  resendStatus.style.display = 'none';
}

// 显示邮箱未确认提示
function showEmailConfirmationMessage(email) {
  errorMessage.style.display = 'none';
  emailConfirmationMessage.style.display = 'block';
  emailConfirmationMessage.setAttribute('data-email', email);
  
  // 如果是 QQ 邮箱，显示特殊提示
  const qqTip = document.getElementById('qq-email-tip');
  if (email.includes('@qq.com')) {
    qqTip.style.display = 'block';
  } else {
    qqTip.style.display = 'none';
  }
}

// 设置加载状态
function setLoading(button, loading) {
  if (!button) {
    console.error('setLoading: button is null');
    return;
  }
  
  const btnText = button.querySelector('.btn-text');
  const btnLoading = button.querySelector('.btn-loading');
  
  if (loading) {
    if (btnText) btnText.style.display = 'none';
    if (btnLoading) btnLoading.style.display = 'inline';
    button.disabled = true;
  } else {
    if (btnText) btnText.style.display = 'inline';
    if (btnLoading) btnLoading.style.display = 'none';
    button.disabled = false;
  }
}

// 验证邮箱格式
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// 处理登录
async function handleLogin() {
  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  // 验证
  if (!email) {
    showError(i18n.t('login.email') + ' ' + i18n.t('message.error'));
    return;
  }

  if (!validateEmail(email)) {
    showError(i18n.t('login.email') + ' ' + i18n.t('message.error'));
    return;
  }

  if (!password) {
    showError(i18n.t('login.password') + ' ' + i18n.t('message.error'));
    return;
  }

  hideError();
  hideSessionExpired();
  setLoading(loginBtn, true);

  try {
    const result = await window.electronAPI.auth.signIn(email, password);
    
    if (result.success) {
      // 登录成功，根据复选框状态决定是否保存凭据
      if (rememberPassword && rememberPassword.checked) {
        await window.electronAPI.credentials.save(email, password);
      } else {
        // 如果未勾选，清除已保存的凭据
        await window.electronAPI.credentials.clear();
      }
      // 登录成功，跳转到主界面
      window.location.href = 'groups.html';
      } else {
        // 检查是否是邮箱未确认错误
        if (result.code === 'email_not_confirmed') {
          showEmailConfirmationMessage(email);
        } else {
          showError(result.error || i18n.t('message.error'));
        }
        setLoading(loginBtn, false);
      }
  } catch (error) {
    showError(i18n.t('message.error') + ': ' + error.message);
    setLoading(loginBtn, false);
  }
}

// 处理注册
async function handleRegister() {
  const email = registerEmail.value.trim();
  const password = registerPassword.value;
  const passwordConfirm = registerPasswordConfirm.value;

  // 验证
  if (!email) {
    showError(i18n.t('login.email') + ' ' + i18n.t('message.error'));
    return;
  }

  if (!validateEmail(email)) {
    showError(i18n.t('login.email') + ' ' + i18n.t('message.error'));
    return;
  }

  if (!password) {
    showError(i18n.t('login.password') + ' ' + i18n.t('message.error'));
    return;
  }

  if (password.length < 6) {
    showError(i18n.t('message.error'));
    return;
  }

  if (password !== passwordConfirm) {
    showError(i18n.t('message.error'));
    return;
  }

  hideError();
  setLoading(registerBtn, true);

  try {
    const result = await window.electronAPI.auth.signUp(email, password);
    
    if (result.success) {
      // 检查是否需要邮箱确认
      if (result.needsConfirmation) {
        // 需要邮箱确认，不自动登录
        // 检查是否有 confirmation_sent_at，说明邮件已发送
        const confirmationSent = result.data?.user?.confirmation_sent_at;
        let message = i18n.t('message.success') + '!';
        
        if (confirmationSent) {
          message += ' ' + i18n.t('login.checkEmail');
        } else {
          message += ' ' + i18n.t('login.checkEmail');
        }
        
        // 特别提示 QQ 邮箱用户
        if (email.includes('@qq.com')) {
          message += '\n\n' + i18n.t('login.qqEmailTip');
        }
        
        showError(message);
        setLoading(registerBtn, false);
        switchForm('login');
        // 切换到登录表单后显示邮箱确认提示
        setTimeout(() => {
          loginEmail.value = email;
          showEmailConfirmationMessage(email);
        }, 100);
      } else {
        // 不需要邮箱确认，尝试自动登录
        const loginResult = await window.electronAPI.auth.signIn(email, password);
        if (loginResult.success) {
          window.location.href = 'groups.html';
        } else {
          // 检查是否是邮箱未确认错误
          if (loginResult.code === 'email_not_confirmed') {
            showError(i18n.t('message.success') + '! ' + i18n.t('login.checkEmail'));
            setLoading(registerBtn, false);
            switchForm('login');
            setTimeout(() => {
              loginEmail.value = email;
              showEmailConfirmationMessage(email);
            }, 100);
          } else {
            showError(i18n.t('message.error'));
            setLoading(registerBtn, false);
            switchForm('login');
          }
        }
      }
    } else {
      showError(result.error || i18n.t('message.error'));
      setLoading(registerBtn, false);
    }
  } catch (error) {
    showError(i18n.t('message.error') + ': ' + error.message);
    setLoading(registerBtn, false);
  }
}

// 处理 GitHub 登录
async function handleGitHubLogin() {
  hideError();
  setLoading(githubLoginBtn, true);

  try {
    const result = await window.electronAPI.auth.signInWithGitHub();
    
    if (!result.success) {
      showError(result.error || i18n.t('message.error'));
      setLoading(githubLoginBtn, false);
    } else {
      // 如果成功，会打开浏览器，显示提示信息
      showError('✓ ' + i18n.t('loading'));
      // 保持加载状态，等待回调
      // 注意：按钮状态会在回调成功或失败时重置
    }
  } catch (error) {
    console.error('GitHub登录异常:', error);
    showError(i18n.t('message.error') + ': ' + error.message);
    setLoading(githubLoginBtn, false);
  }
}

// 检查 OAuth 回调
function checkOAuthCallback() {
  // 监听认证状态变化
  window.electronAPI.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      // 登录成功，跳转到主界面
      window.location.href = 'groups.html';
    }
  });

  // 监听主进程发送的 OAuth 回调和邮箱确认回调
  window.electronAPI.auth.onOAuthCallback(async (url) => {
    try {
      // 重置GitHub登录按钮状态（如果按钮存在）
      if (githubLoginBtn) {
        setLoading(githubLoginBtn, false);
      }
      
      const result = await window.electronAPI.auth.handleOAuthCallback(url);
      if (result.success) {
        if (result.type === 'email_confirmation') {
          // 邮箱确认成功，显示成功消息并跳转
          showError('✓ ' + i18n.t('message.success') + '! ' + i18n.t('loading'));
          setTimeout(() => {
            window.location.href = 'groups.html';
          }, 1000);
        } else {
          // OAuth登录成功
          showError('✓ ' + i18n.t('message.success') + '! ' + i18n.t('loading'));
          setTimeout(() => {
            window.location.href = 'groups.html';
          }, 500);
        }
      } else {
        showError(i18n.t('message.error') + ': ' + result.error);
      }
    } catch (error) {
      console.error('回调处理错误:', error);
      showError(i18n.t('message.error') + ': ' + error.message);
      if (githubLoginBtn) {
        setLoading(githubLoginBtn, false);
      }
    }
  });
}

// 初始化语言
async function initLanguage() {
  try {
    let lang = 'zh-CN'; // 默认语言
    
    // 尝试从设置文件读取语言设置
    try {
      const settings = await window.electronAPI.loadSettings();
      if (settings && settings.language) {
        lang = settings.language;
      } else {
        // 如果没有设置，检测系统语言
        const systemLang = navigator.language || navigator.languages?.[0] || 'zh-CN';
        // 如果系统语言以 en 开头，使用 en-US，否则使用 zh-CN
        if (systemLang.toLowerCase().startsWith('en')) {
          lang = 'en-US';
        } else {
          lang = 'zh-CN';
        }
      }
    } catch (error) {
      console.error('读取语言设置失败，使用系统语言:', error);
      // 如果读取设置失败，检测系统语言
      const systemLang = navigator.language || navigator.languages?.[0] || 'zh-CN';
      if (systemLang.toLowerCase().startsWith('en')) {
        lang = 'en-US';
      } else {
        lang = 'zh-CN';
      }
    }
    
    // 初始化 i18n
    i18n.init(lang);
    // 更新 HTML lang 属性
    document.documentElement.lang = lang;
    // 更新界面文本
    updateUI();
  } catch (error) {
    console.error('初始化语言失败:', error);
    // 如果初始化失败，使用默认中文
    i18n.init('zh-CN');
    updateUI();
  }
}

// 更新界面文本
function updateUI() {
  // 更新所有带有 data-i18n 属性的元素的文本内容
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = i18n.t(key);
  });
  
  // 更新所有带有 data-i18n-placeholder 属性的输入框的 placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = i18n.t(key);
  });
  
  // 更新所有带有 data-i18n-title 属性的元素的 title
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    el.title = i18n.t(key);
  });
  
  // 更新按钮加载状态的文本
  const loginBtnText = loginBtn.querySelector('.btn-text');
  const loginBtnLoading = loginBtn.querySelector('.btn-loading');
  const registerBtnText = registerBtn.querySelector('.btn-text');
  const registerBtnLoading = registerBtn.querySelector('.btn-loading');
  
  if (loginBtnText) loginBtnText.textContent = i18n.t('login.login');
  if (loginBtnLoading) loginBtnLoading.textContent = i18n.t('login.logging');
  if (registerBtnText) registerBtnText.textContent = i18n.t('login.register');
  if (registerBtnLoading) registerBtnLoading.textContent = i18n.t('login.registering');
}

// 加载主题模式
async function loadThemeMode() {
  try {
    const settings = await window.electronAPI.loadSettings();
    if (settings && settings.themeMode) {
      document.body.className = settings.themeMode + '-theme';
    }
  } catch (error) {
    console.error('加载主题模式失败:', error);
  }
}

// 加载保存的凭据
async function loadSavedCredentials() {
  try {
    const hasCredentials = await window.electronAPI.credentials.has();
    if (hasCredentials) {
      const result = await window.electronAPI.credentials.get();
      if (result.success && result.email && result.password) {
        // 自动填充账号和密码
        loginEmail.value = result.email;
        loginPassword.value = result.password;
        // 勾选记住密码复选框
        if (rememberPassword) {
          rememberPassword.checked = true;
        }
      }
    }
  } catch (error) {
    console.error('加载保存的凭据失败:', error);
  }
}

// 启动应用
init();

