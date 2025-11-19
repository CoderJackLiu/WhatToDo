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
const registerEmail = document.getElementById('register-email');
const registerPassword = document.getElementById('register-password');
const registerPasswordConfirm = document.getElementById('register-password-confirm');

// 当前模式：'login' 或 'register'
let currentMode = 'login';

// 初始化
function init() {
  bindEvents();
  checkOAuthCallback();
  loadThemeMode();
  listenForSessionExpired();
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

  // 注册
  registerBtn.addEventListener('click', handleRegister);
  registerPasswordConfirm.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleRegister();
  });

  // GitHub 登录
  githubLoginBtn.addEventListener('click', handleGitHubLogin);

  // 重新发送确认邮件
  resendConfirmationLink.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = emailConfirmationMessage.getAttribute('data-email');
    if (!email) return;

    resendStatus.style.display = 'block';
    resendStatus.textContent = '正在发送...';
    resendStatus.style.color = '#5c4f3a';

    try {
      const result = await window.electronAPI.auth.resendConfirmation(email);
      if (result.success) {
        let successMsg = '✓ 确认邮件已发送，请检查您的邮箱（包括垃圾邮件文件夹）';
        
        // QQ 邮箱特殊提示
        if (email.includes('@qq.com')) {
          successMsg += '\n⚠️ QQ 邮箱用户：请务必检查"垃圾箱"文件夹！';
        }
        
        resendStatus.textContent = successMsg;
        resendStatus.style.color = '#4caf50';
        
        // 3秒后添加额外提示
        setTimeout(() => {
          if (resendStatus.textContent.includes('✓')) {
            let extraTip = '\n💡 提示：如果仍未收到，请等待2-3分钟后重试（避免频率限制）';
            if (email.includes('@qq.com')) {
              extraTip += '\n💡 QQ 邮箱建议：将发件人添加到白名单，或使用其他邮箱地址';
            }
            resendStatus.textContent += extraTip;
          }
        }, 3000);
      } else {
        resendStatus.textContent = '✗ 发送失败：' + (result.error || '未知错误');
        resendStatus.style.color = '#f44336';
        
        // 如果是频率限制错误，添加提示
        if (result.code === 'rate_limit_exceeded' || result.error?.includes('频率')) {
          setTimeout(() => {
            resendStatus.textContent += '\n⏰ 提示：发送频率过高，请等待5-10分钟后再试';
          }, 1000);
        }
      }
    } catch (error) {
      console.error('发送邮件异常:', error);
      resendStatus.textContent = '✗ 发送失败：' + error.message;
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
    showError('请输入邮箱地址');
    return;
  }

  if (!validateEmail(email)) {
    showError('请输入有效的邮箱地址');
    return;
  }

  if (!password) {
    showError('请输入密码');
    return;
  }

  hideError();
  hideSessionExpired();
  setLoading(loginBtn, true);

  try {
    const result = await window.electronAPI.auth.signIn(email, password);
    
    if (result.success) {
      // 登录成功，跳转到主界面
      window.location.href = 'groups.html';
    } else {
      // 检查是否是邮箱未确认错误
      if (result.code === 'email_not_confirmed') {
        showEmailConfirmationMessage(email);
      } else {
        showError(result.error || '登录失败，请检查邮箱和密码');
      }
      setLoading(loginBtn, false);
    }
  } catch (error) {
    showError('登录失败：' + error.message);
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
    showError('请输入邮箱地址');
    return;
  }

  if (!validateEmail(email)) {
    showError('请输入有效的邮箱地址');
    return;
  }

  if (!password) {
    showError('请输入密码');
    return;
  }

  if (password.length < 6) {
    showError('密码长度至少6位');
    return;
  }

  if (password !== passwordConfirm) {
    showError('两次输入的密码不一致');
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
        let message = '注册成功！';
        
        if (confirmationSent) {
          message += '确认邮件已发送到您的邮箱，请查收（包括垃圾邮件文件夹）。';
        } else {
          message += '请检查您的邮箱并点击确认链接以完成登录。';
        }
        
        // 特别提示 QQ 邮箱用户
        if (email.includes('@qq.com')) {
          message += '\n\n提示：QQ 邮箱可能将邮件标记为垃圾邮件，请检查"垃圾箱"文件夹。';
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
            showError('注册成功！请检查您的邮箱并点击确认链接以完成登录。');
            setLoading(registerBtn, false);
            switchForm('login');
            setTimeout(() => {
              loginEmail.value = email;
              showEmailConfirmationMessage(email);
            }, 100);
          } else {
            showError('注册成功，但自动登录失败，请手动登录');
            setLoading(registerBtn, false);
            switchForm('login');
          }
        }
      }
    } else {
      showError(result.error || '注册失败，请稍后重试');
      setLoading(registerBtn, false);
    }
  } catch (error) {
    showError('注册失败：' + error.message);
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
      showError(result.error || 'GitHub 登录失败');
      setLoading(githubLoginBtn, false);
    } else {
      // 如果成功，会打开浏览器，显示提示信息
      showError('✓ 正在打开浏览器进行GitHub授权，请完成授权后返回应用...');
      // 保持加载状态，等待回调
      // 注意：按钮状态会在回调成功或失败时重置
    }
  } catch (error) {
    console.error('GitHub登录异常:', error);
    showError('GitHub 登录失败：' + error.message);
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
      // 重置GitHub登录按钮状态
      setLoading(githubLoginBtn, false);
      
      const result = await window.electronAPI.auth.handleOAuthCallback(url);
      if (result.success) {
        if (result.type === 'email_confirmation') {
          // 邮箱确认成功，显示成功消息并跳转
          showError('✓ 邮箱确认成功！正在登录...');
          setTimeout(() => {
            window.location.href = 'groups.html';
          }, 1000);
        } else {
          // OAuth登录成功
          showError('✓ GitHub登录成功！正在跳转...');
          setTimeout(() => {
            window.location.href = 'groups.html';
          }, 500);
        }
      } else {
        showError('登录失败：' + result.error);
      }
    } catch (error) {
      console.error('回调处理错误:', error);
      showError('登录失败：' + error.message);
      setLoading(githubLoginBtn, false);
    }
  });
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

// 启动应用
init();

